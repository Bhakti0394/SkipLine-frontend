import "../../styles/QShiftlogo.scss";

interface QShiftLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const QShiftLogo = ({ size = "md", className = "" }: QShiftLogoProps) => {
  return (
    <div
      className={`QShift-logo QShift-logo--${size} ${className}`}
    >
      {/* Shine effect */}
      <div className="QShift-logo__shine" />
      
      {/* Inner glow */}
      <div className="QShift-logo__inner-glow" />
      
      {/* Letter P with stylized design */}
      <span className="QShift-logo__letter">
        S
      </span>
      
      {/* Subtle corner accent */}
      <div className="QShift-logo__corner-accent" />
    </div>
  );
};

export default QShiftLogo;



