import "../../styles/SkipLinelogo.scss";

interface SkipLineLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SkipLineLogo = ({ size = "md", className = "" }: SkipLineLogoProps) => {
  return (
    <div
      className={`SkipLine-logo SkipLine-logo--${size} ${className}`}
    >
      {/* Shine effect */}
      <div className="SkipLine-logo__shine" />
      
      {/* Inner glow */}
      <div className="SkipLine-logo__inner-glow" />
      
      {/* Letter P with stylized design */}
      <span className="SkipLine-logo__letter">
        S
      </span>
      
      {/* Subtle corner accent */}
      <div className="SkipLine-logo__corner-accent" />
    </div>
  );
};

export default SkipLineLogo;