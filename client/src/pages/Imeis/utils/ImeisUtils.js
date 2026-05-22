/**
 * IMEI-Utils - Re-export für alle IMEI-bezogenen Hilfsfunktionen
 */
export { maskImei } from './imeisMask';
export {
  getProductFull,
  extractGB,
  extractProductVersion,
  extractProductVariant,
  extractColor,
  removeColorAndManufacturerFromProduct,
  hasO2Aktion,
  getProduct,
  isAppleManufacturerName,
  isAppleWatchProductFull
} from './imeisProductUtils';
export {
  getManufacturer,
  getManufacturerColumnKey,
  expandSelection
} from './imeisManufacturerUtils';
