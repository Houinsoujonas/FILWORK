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
  to,
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

  const isLink = Boolean(to) && !disabled && !loading;
  const Element = isLink ? "a" : "button";
  return (
    <Element
      type={isLink ? undefined : type}
      href={isLink ? to : undefined}
      className={classes}
      onClick={onClick}
      {...(!isLink ? { disabled: disabled || loading } : {})}
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
    </Element>
  );
}

export default Button;
