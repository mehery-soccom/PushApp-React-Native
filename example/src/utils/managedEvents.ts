/**
 * Managed-events payload builders (see managed-events-sdk.md).
 * Ops use objectType / objectOperation; only op.data is written to managed objects.
 */

import type { Product } from '../data/products';

export type ManagedObjectType = 'ORDER' | 'ORDER_ITEM' | 'CART_ITEM';
export type ManagedObjectOperation =
  | 'PUT'
  | 'MERGE'
  | 'TRIM'
  | 'DELETE'
  | 'TRUNCATE';

export type ManagedOp = {
  objectType: ManagedObjectType;
  objectId?: string;
  objectOperation?: ManagedObjectOperation;
  data?: Record<string, unknown>;
  fields?: string[];
};

/** Allowed ITEM keys for ORDER_ITEM / CART_ITEM op.data */
export type ManagedItemData = {
  item_id: string;
  handle?: string;
  item_name?: string;
  item_variant?: string;
  price?: number;
  original_price?: number;
  discount?: number;
  url?: string;
  sku?: string;
  item_category?: string;
  item_brand?: string;
  img_url?: string;
  quantity?: number;
};

/** Allowed ORDER keys for ORDER op.data */
export type ManagedOrderData = {
  order_id?: string;
  transaction_id?: string;
  shopify_order_id?: string;
  url?: string;
  value?: number;
  checkout_token?: string;
  sub_total?: number;
  discount?: number;
  currency?: string;
  coupon?: string;
  items?: ManagedItemData[];
};

export function toManagedItemData(
  product: Product,
  quantity?: number
): ManagedItemData {
  const item: ManagedItemData = {
    item_id: product.productId,
    sku: product.productId,
    item_name: product['item-name'],
    item_category: product.productCategory,
    item_brand: product.itemBrand,
    price: product.price,
    original_price: product.mrp,
  };
  if (quantity !== undefined) {
    item.quantity = quantity;
  }
  return item;
}

export function cartItemPutOp(
  product: Product,
  quantity: number
): ManagedOp {
  return {
    objectType: 'CART_ITEM',
    data: toManagedItemData(product, quantity),
  };
}

export function cartItemDeleteOp(product: Product): ManagedOp {
  return {
    objectType: 'CART_ITEM',
    objectOperation: 'DELETE',
    data: { item_id: product.productId },
  };
}

export function cartItemTruncateOp(): ManagedOp {
  return {
    objectType: 'CART_ITEM',
    objectOperation: 'TRUNCATE',
  };
}

export function orderPutOp(order: ManagedOrderData): ManagedOp {
  return {
    objectType: 'ORDER',
    data: order,
  };
}

/** add_to_cart / cart line upsert — CART_ITEM PUT (default op). */
export function addToCartManagedPayload(
  product: Product,
  quantity: number,
  cartValue: number
): Record<string, unknown> {
  const item = toManagedItemData(product, quantity);
  return {
    ...item,
    value: cartValue,
    currency: 'INR',
    ops: [cartItemPutOp(product, quantity)],
  };
}

/**
 * remove_from_cart — DELETE when the line is gone, else PUT remaining qty.
 */
export function removeFromCartManagedPayload(
  product: Product,
  remainingQuantity: number,
  cartValue: number
): Record<string, unknown> {
  if (remainingQuantity <= 0) {
    return {
      item_id: product.productId,
      value: cartValue,
      currency: 'INR',
      ops: [cartItemDeleteOp(product)],
    };
  }

  const item = toManagedItemData(product, remainingQuantity);
  return {
    ...item,
    value: cartValue,
    currency: 'INR',
    ops: [cartItemPutOp(product, remainingQuantity)],
  };
}

/** view_cart — regular event payload with managed item keys (no ops). */
export function viewCartManagedPayload(
  product: Product,
  quantity: number,
  cartValue: number
): Record<string, unknown> {
  return {
    ...toManagedItemData(product, quantity),
    value: cartValue,
    currency: 'INR',
  };
}

/** placed_order — one ORDER PUT with items[]; clears cart on the server. */
export function placeOrderManagedPayload(
  orderId: string,
  items: ManagedItemData[],
  value: number
): Record<string, unknown> {
  const orderData: ManagedOrderData = {
    order_id: orderId,
    value,
    currency: 'INR',
    items,
  };
  return {
    ...orderData,
    ops: [orderPutOp(orderData)],
  };
}
