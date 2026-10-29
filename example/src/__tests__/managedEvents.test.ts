import { PRODUCTS } from '../data/products';
import {
  addToCartManagedPayload,
  placeOrderManagedPayload,
  removeFromCartManagedPayload,
  toManagedItemData,
} from '../utils/managedEvents';

describe('managedEvents payloads', () => {
  const product = PRODUCTS[0]!;

  it('add_to_cart uses CART_ITEM PUT with allowed item keys', () => {
    const payload = addToCartManagedPayload(product, 2, 2598);

    expect(payload.item_id).toBe('SKU-001');
    expect(payload.item_name).toBe('Wireless Earbuds');
    expect(payload.item_brand).toBe('SoundPeak');
    expect(payload.item_category).toBe('Electronics');
    expect(payload.price).toBe(1299);
    expect(payload.original_price).toBe(1999);
    expect(payload.quantity).toBe(2);
    expect(payload.currency).toBe('INR');
    expect(payload.ops).toEqual([
      {
        objectType: 'CART_ITEM',
        data: expect.objectContaining({
          item_id: 'SKU-001',
          item_brand: 'SoundPeak',
          quantity: 2,
        }),
      },
    ]);
    expect((payload.ops as unknown[])[0]).not.toHaveProperty('type');
    expect((payload.ops as unknown[])[0]).not.toHaveProperty('operation');
  });

  it('remove_from_cart DELETEs when quantity is 0', () => {
    const payload = removeFromCartManagedPayload(product, 0, 0);

    expect(payload.ops).toEqual([
      {
        objectType: 'CART_ITEM',
        objectOperation: 'DELETE',
        data: { item_id: 'SKU-001' },
      },
    ]);
  });

  it('remove_from_cart PUTs remaining quantity', () => {
    const payload = removeFromCartManagedPayload(product, 1, 1299);

    expect(payload.ops).toEqual([
      {
        objectType: 'CART_ITEM',
        data: expect.objectContaining({
          item_id: 'SKU-001',
          quantity: 1,
        }),
      },
    ]);
  });

  it('placed_order uses ORDER PUT with items[]', () => {
    const items = [toManagedItemData(product, 1)];
    const payload = placeOrderManagedPayload('ORD-123', items, 1299);

    expect(payload.order_id).toBe('ORD-123');
    expect(payload.value).toBe(1299);
    expect(payload.currency).toBe('INR');
    expect(payload.items).toEqual(items);
    expect(payload.ops).toEqual([
      {
        objectType: 'ORDER',
        data: {
          order_id: 'ORD-123',
          value: 1299,
          currency: 'INR',
          items,
        },
      },
    ]);
  });
});
