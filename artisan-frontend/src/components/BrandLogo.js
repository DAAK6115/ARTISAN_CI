export default function BrandLogo({
  subtitle,
  imageClassName = '',
  subtitleClassName = '',
  className = '',
  alt = 'Logo ARTISAN_CI',
  variant = 'default',
}) {
  const source = variant === 'horizontal'
    ? '/artisan-ci-logo-horizontal.png'
    : '/artisan-ci-logo.png';

  const imageClasses = [
    variant === 'horizontal' ? 'h-12' : 'h-10',
    'w-auto',
    'max-w-full',
    'object-contain',
    imageClassName,
  ].filter(Boolean).join(' ');
  const subtitleClasses = ['mt-1', 'truncate', 'text-[10px]', 'font-semibold', 'text-[#829087]', subtitleClassName].filter(Boolean).join(' ');
  const containerClasses = ['min-w-0', className].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <img
        src={source}
        alt={alt}
        className={imageClasses}
        loading="eager"
      />
      {subtitle ? <p className={subtitleClasses}>{subtitle}</p> : null}
    </div>
  );
}
