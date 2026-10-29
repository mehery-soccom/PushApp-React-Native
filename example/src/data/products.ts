export type Product = {
  productId: string;
  'item-name': string;
  productCategory: string;
  itemBrand: string;
  price: number;
  mrp: number;
  'product-value': number;
};

export const PRODUCTS: Product[] = [
  {
    productId: 'SKU-001',
    'item-name': 'Wireless Earbuds',
    productCategory: 'Electronics',
    itemBrand: 'SoundPeak',
    price: 1299,
    mrp: 1999,
    'product-value': 1299,
  },
  {
    productId: 'SKU-002',
    'item-name': 'Running Shoes',
    productCategory: 'Footwear',
    itemBrand: 'StrideCo',
    price: 2499,
    mrp: 3499,
    'product-value': 2499,
  },
  {
    productId: 'SKU-003',
    'item-name': 'Ceramic Mug',
    productCategory: 'Home',
    itemBrand: 'ClayHouse',
    price: 499,
    mrp: 799,
    'product-value': 499,
  },
];

export function getProductById(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.productId === productId);
}
