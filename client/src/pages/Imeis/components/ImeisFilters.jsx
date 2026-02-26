const ImeisFilters = ({
  availableManufacturers,
  activeManufacturer,
  onManufacturerChange,
  availableVersions,
  activeVersion,
  onVersionChange,
  availableVariants,
  activeVariant,
  onVariantChange,
  availableGBs,
  activeGB,
  onGBChange,
  availableProducts,
  activeProduct,
  onProductChange
}) => {
  const getProductName = (version, manufacturer) => {
    let productName = '';
    const manufacturerLower = manufacturer.toLowerCase();
    if (manufacturerLower.includes('apple')) {
      if (version.startsWith('SE')) {
        productName = `iPhone ${version}`;
      } else {
        productName = `iPhone ${version}`;
      }
    } else if (manufacturerLower.includes('google')) {
      productName = `Pixel ${version}`;
    } else if (manufacturerLower.includes('samsung')) {
      productName = version.startsWith('S') ? `Galaxy ${version}` : `Galaxy S${version}`;
    } else {
      productName = `${manufacturer} ${version}`;
    }
    return productName;
  };

  return (
    <>
      {availableManufacturers.length > 0 && (
        <div className="imeis-manufacturer-tabs">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onManufacturerChange(null);
            }}
            className={`imeis-manufacturer-tab ${activeManufacturer === null ? 'imeis-manufacturer-tab--active' : ''}`}
            type="button"
          >
            Alle
          </button>
          {availableManufacturers.map((manufacturer) => (
            <button
              key={manufacturer}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onManufacturerChange(manufacturer);
              }}
              className={`imeis-manufacturer-tab ${activeManufacturer === manufacturer ? 'imeis-manufacturer-tab--active' : ''}`}
              type="button"
            >
              {manufacturer}
            </button>
          ))}
        </div>
      )}

      {activeManufacturer && (
        <>
          {availableVersions.length > 0 && (
            <div className="imeis-product-tabs">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onVersionChange(null);
                }}
                className={`imeis-product-tab ${activeVersion === null ? 'imeis-product-tab--active' : ''}`}
                type="button"
              >
                Alle Versionen
              </button>
              {availableVersions.map((version) => (
                <button
                  key={version}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onVersionChange(version);
                  }}
                  className={`imeis-product-tab ${activeVersion === version ? 'imeis-product-tab--active' : ''}`}
                  type="button"
                >
                  {getProductName(version, activeManufacturer)}
                </button>
              ))}
            </div>
          )}

          {activeVersion && availableVariants.length > 0 && (
            <div className="imeis-product-tabs">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onVariantChange(null);
                }}
                className={`imeis-product-tab ${activeVariant === null ? 'imeis-product-tab--active' : ''}`}
                type="button"
              >
                Alle Varianten
              </button>
              {availableVariants.map((variant) => (
                <button
                  key={variant}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onVariantChange(variant || '');
                  }}
                  className={`imeis-product-tab ${activeVariant === variant ? 'imeis-product-tab--active' : ''}`}
                  type="button"
                >
                  {variant || 'Standard'}
                </button>
              ))}
            </div>
          )}

          {activeVersion && activeVariant !== null && availableGBs.length > 0 && (
            <div className="imeis-product-tabs">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onGBChange(null);
                }}
                className={`imeis-product-tab ${activeGB === null ? 'imeis-product-tab--active' : ''}`}
                type="button"
              >
                Alle GB
              </button>
              {availableGBs.map((gb) => (
                <button
                  key={gb}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onGBChange(gb);
                  }}
                  className={`imeis-product-tab ${activeGB === gb ? 'imeis-product-tab--active' : ''}`}
                  type="button"
                >
                  {gb}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeManufacturer && 
       availableProducts.length > 0 && 
       availableVersions.length === 0 && (
        <div className="imeis-product-tabs">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onProductChange(null);
            }}
            className={`imeis-product-tab ${activeProduct === null ? 'imeis-product-tab--active' : ''}`}
            type="button"
          >
            Alle Produkte
          </button>
          {availableProducts.map((product) => (
            <button
              key={product}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onProductChange(product);
              }}
              className={`imeis-product-tab ${activeProduct === product ? 'imeis-product-tab--active' : ''}`}
              type="button"
            >
              {product}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default ImeisFilters;
