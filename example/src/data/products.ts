export type Product = {
  productId: string;
  'item-name': string;
  productCategory: string;
  price: number;
  mrp: number;
  'product-value': number;
};

export const PRODUCTS: Product[] = [
  {
    productId: 'SKU-001',
    'item-name': 'Wireless Earbuds',
    productCategory: 'Electronics',
    price: 1299,
    mrp: 1999,
    'product-value': 1299,
  },
  {
    productId: 'SKU-002',
    'item-name': 'Running Shoes',
    productCategory: 'Footwear',
    price: 2499,
    mrp: 3499,
    'product-value': 2499,
  },
  {
    productId: 'SKU-003',
    'item-name': 'Ceramic Mug',
    productCategory: 'Home',
    price: 499,
    mrp: 799,
    'product-value': 499,
  },
];

export function getProductById(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.productId === productId);
}

export function productEventPayload(
  product: Product,
  latestCartValue: number
): Record<string, string | number> {
  return {
    productId: product.productId,
    'item-name': product['item-name'],
    productCategory: product.productCategory,
    price: product.price,
    mrp: product.mrp,
    'product-value': product['product-value'],
    'latest-cart-value': latestCartValue,
  };
}
