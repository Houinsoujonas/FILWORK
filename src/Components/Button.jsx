import "./Button.css";

function Button({
  children,
  variant = "primary",
  size = "medium",
  type = "button",
  icon = null,
  iconPosition = "right",
  fullWidth = false,
  disabled = false,
  loading = false,
  className = "",
  onClick,
  ...props
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? "btn--full-width" : "",
    disabled || loading ? "btn--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="btn__loader" aria-label="Chargement" />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="btn__icon" aria-hidden="true">
              {icon}
            </span>
          )}

          <span className="btn__label">{children}</span>

          {icon && iconPosition === "right" && (
            <span className="btn__icon" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export default Button;