export const usbDevices = { filters: [
    {'vendorId': 1155, 'productId': 57105},
    {'vendorId': 10473, 'productId': 393},
] };

export const DeviceType = Object.freeze({
  Standard: "standard",
  DFU: "dfu",
  Manual: "manual",
  Virtual: "virtual",
});
