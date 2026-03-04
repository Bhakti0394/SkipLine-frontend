import "../../styles/Preplinelogo.scss";

interface PreplineLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const PreplineLogo = ({ size = "md", className = "" }: PreplineLogoProps) => {
  return (
    <div
      className={`prepline-logo prepline-logo--${size} ${className}`}
    >
      {/* Shine effect */}
      <div className="prepline-logo__shine" />
      
      {/* Inner glow */}
      <div className="prepline-logo__inner-glow" />
      
      {/* Letter P with stylized design */}
      <span className="prepline-logo__letter">
        P
      </span>
      
      {/* Subtle corner accent */}
      <div className="prepline-logo__corner-accent" />
    </div>
  );
};

export default PreplineLogo;