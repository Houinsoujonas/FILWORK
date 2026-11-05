param(
  [ValidateSet("setup", "start", "stop", "status")]
  [string]$Action = "setup"
)

$ErrorActionPreference = "Stop"

# Cluster PostgreSQL portable, strictement local et isolé.
# Aucune administration système, aucun service Windows, aucun accès production.
$root = Join-Path $env:TEMP "opencode"
$zip = Join-Path $root "postgresql-17.6-1-windows-x64-binaries.zip"
$pgRoot = Join-Path $root "pgsql"
$data = Join-Path $root "filwork-pgdata"
$log = Join-Path $root "filwork-pg.log"
$stateFile = Join-Path $root "filwork-pg-state.json"
$passwordFile = Join-Path $root "filwork-pg-superuser.pw"
$port = 55432
$database = "filwork_test"
$role = "filwork_test"

$bin = Join-Path $pgRoot "bin"
$pgCtl = Join-Path $bin "pg_ctl.exe"
$initdb = Join-Path $bin "initdb.exe"
$psql = Join-Path $bin "psql.exe"
$pgIsReady = Join-Path $bin "pg_isready.exe"

New-Item -ItemType Directory -Force -Path $root | Out-Null

function New-Secret {
  $value = node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

  if ($LASTEXITCODE -ne 0 -or -not $value) {
    throw "Impossible de générer un secret avec Node.js."
  }

  return $value.Trim()
}

function Wait-UntilReady {
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    & $pgIsReady -h 127.0.0.1 -p $port -U postgres *> $null

    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Milliseconds 500
  }

  throw "PostgreSQL n'est pas prêt sur 127.0.0.1:$port. Consultez $log."
}

function Assert-Installed {
  if (-not (Test-Path $pgCtl)) {
    throw "PostgreSQL portable est absent. Lancez d'abord : localTestPostgres.ps1 setup"
  }
}

function Invoke-PsqlScalar([string]$Query) {
  $output = & $psql -h 127.0.0.1 -p $port -U postgres -d postgres -tAc $Query 2>$null

  # Une requête sans résultat produit $null : normaliser en chaîne vide.
  return ("$output").Trim()
}

function Start-Cluster {
  Assert-Installed

  & $pgCtl -D $data status *> $null

  if ($LASTEXITCODE -eq 0) {
    Wait-UntilReady
    return
  }

  & $pgCtl -D $data -l $log -o "-p $port -c listen_addresses=127.0.0.1" start

  if ($LASTEXITCODE -ne 0) {
    throw "Démarrage PostgreSQL impossible. Consultez $log."
  }

  Wait-UntilReady
}

function Update-TestEnv([string]$appPassword) {
  $envTest = Join-Path $PSScriptRoot "..\.env.test"

  if (-not (Test-Path $envTest)) {
    throw "Le fichier .env.test est absent."
  }

  $url = "postgresql://$role`:$appPassword@127.0.0.1:$port/$database"
  $content = Get-Content -Raw -Path $envTest

  if ($content -match "(?m)^TEST_DATABASE_URL=") {
    $content = [regex]::Replace(
      $content,
      "(?m)^TEST_DATABASE_URL=.*$",
      "TEST_DATABASE_URL=$url"
    )
  } else {
    $content = $content.TrimEnd() + "`r`nTEST_DATABASE_URL=$url`r`n"
  }

  Set-Content -Path $envTest -Value $content -NoNewline -Encoding utf8
  Write-Host "[pg-test] TEST_DATABASE_URL mis à jour pour 127.0.0.1:$port/$database."
}

switch ($Action) {
  "setup" {
    if (-not (Test-Path $zip)) {
      Write-Host "[pg-test] Téléchargement de PostgreSQL portable..."
      curl.exe -L --fail --retry 3 --retry-delay 2 -o $zip "https://get.enterprisedb.com/postgresql/postgresql-17.6-1-windows-x64-binaries.zip"

      if ($LASTEXITCODE -ne 0) {
        throw "Téléchargement PostgreSQL impossible."
      }
    }

    if (-not (Test-Path $pgCtl)) {
      Write-Host "[pg-test] Extraction de l'archive..."
      Expand-Archive -Path $zip -DestinationPath $root -Force
    }

    Assert-Installed

    $state = $null

    if (Test-Path $stateFile) {
      $state = Get-Content -Raw -Path $stateFile | ConvertFrom-Json
    }

    if (-not (Test-Path $data)) {
      $superuserPassword = New-Secret
      $appPassword = New-Secret

      Set-Content -Path $passwordFile -Value $superuserPassword -NoNewline -Encoding ascii

      & $initdb -D $data -U postgres "--pwfile=$passwordFile" "--auth=scram-sha-256" "--encoding=UTF8" "--locale=C"

      if ($LASTEXITCODE -ne 0) {
        throw "Initialisation du cluster PostgreSQL impossible."
      }

      Add-Content -Path (Join-Path $data "postgresql.conf") -Value "`r`nport = $port`r`nlisten_addresses = '127.0.0.1'`r`n"

      $state = [pscustomobject]@{
        superuserPassword = $superuserPassword
        appPassword = $appPassword
        port = $port
        database = $database
        role = $role
      }

      $state | ConvertTo-Json | Set-Content -Path $stateFile -Encoding utf8
      Remove-Item -Path $passwordFile -Force -ErrorAction SilentlyContinue
    }

    if (-not $state) {
      throw "Le cluster existe mais l'état local est introuvable : $stateFile"
    }

    Start-Cluster

    $env:PGPASSWORD = $state.superuserPassword

    # Une requête sans résultat renvoie $null sous PowerShell : forcer une chaîne.
    $roleExists = Invoke-PsqlScalar "SELECT 1 FROM pg_roles WHERE rolname = '$role'"

    if ($roleExists -ne "1") {
      & $psql -h 127.0.0.1 -p $port -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE $role LOGIN PASSWORD '$($state.appPassword)' NOSUPERUSER NOCREATEDB NOCREATEROLE"

      if ($LASTEXITCODE -ne 0) {
        throw "Création du rôle de test impossible."
      }
    }

    $databaseExists = Invoke-PsqlScalar "SELECT 1 FROM pg_database WHERE datname = '$database'"

    if ($databaseExists -ne "1") {
      & $psql -h 127.0.0.1 -p $port -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $database OWNER $role"

      if ($LASTEXITCODE -ne 0) {
        throw "Création de la base de test impossible."
      }
    }

    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

    Update-TestEnv $state.appPassword

    Write-Host "[pg-test] PostgreSQL de test prêt sur 127.0.0.1:$port/$database."
  }

  "start" {
    if (-not (Test-Path $stateFile)) {
      throw "État local absent. Lancez d'abord : localTestPostgres.ps1 setup"
    }

    Start-Cluster
    Write-Host "[pg-test] PostgreSQL de test démarré sur 127.0.0.1:$port."
  }

  "stop" {
    Assert-Installed

    & $pgCtl -D $data status *> $null

    if ($LASTEXITCODE -ne 0) {
      Write-Host "[pg-test] PostgreSQL de test n'est pas démarré."
      return
    }

    & $pgCtl -D $data stop -m fast

    if ($LASTEXITCODE -ne 0) {
      throw "Arrêt PostgreSQL impossible."
    }

    Write-Host "[pg-test] PostgreSQL de test arrêté."
  }

  "status" {
    Assert-Installed
    & $pgCtl -D $data status
  }
}
