export const maskImei = (imei) => {
  if (!imei || typeof imei !== 'string') return imei;
  if (imei.length <= 4) return imei;
  return '*'.repeat(imei.length - 4) + imei.slice(-4);
};
