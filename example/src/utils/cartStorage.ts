import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProductById } from '../data/products';

export const STORAGE_KEYS = {
  cartItems: 'cart_items',
  latestCartValue: 'latest-cart-value',
  totalOrders: 'total_orders',
  registrationCompleted: 'registration_completed',
  profileName: 'profile_name',
} as const;

export type CartItems = Record<string, number>;

export async function getCartItems(): Promise<CartItems> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.cartItems);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CartItems;
  } catch {
    return {};
  }
}

export async function setCartItems(items: CartItems): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.cartItems, JSON.stringify(items));
}

export async function getLatestCartValue(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.latestCartValue);
  return raw ? Number(raw) || 0 : 0;
}

export async function setLatestCartValue(value: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.latestCartValue, String(value));
}

export async function getTotalOrders(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.totalOrders);
  return raw ? Number(raw) || 0 : 0;
}

export async function incrementTotalOrders(): Promise<number> {
  const next = (await getTotalOrders()) + 1;
  await AsyncStorage.setItem(STORAGE_KEYS.totalOrders, String(next));
  return next;
}

export async function getRegistrationCompleted(): Promise<0 | 1> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.registrationCompleted);
  return raw === '1' ? 1 : 0;
}

export async function setRegistrationCompleted(value: 0 | 1): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.registrationCompleted, String(value));
}

export async function getProfileName(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.profileName)) ?? '';
}

export async function setProfileName(name: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.profileName, name);
}

export function computeCartTotal(items: CartItems): number {
  return Object.entries(items).reduce((sum, [productId, qty]) => {
    const product = getProductById(productId);
    if (!product || qty <= 0) return sum;
    return sum + product.price * qty;
  }, 0);
}

export async function persistCart(items: CartItems): Promise<number> {
  const total = computeCartTotal(items);
  await setCartItems(items);
  await setLatestCartValue(total);
  return total;
}

export async function clearCart(): Promise<void> {
  await setCartItems({});
  await setLatestCartValue(0);
}

export async function clearCommerceStorage(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.cartItems,
    STORAGE_KEYS.latestCartValue,
    STORAGE_KEYS.totalOrders,
    STORAGE_KEYS.registrationCompleted,
    STORAGE_KEYS.profileName,
  ]);
}

// Mandatory dashboard field for channel demo
export const CHANNEL_REQUIRED_FIELDS = {
  _h1_ajejik_h2_: 'static',
};

export async function buildProfilePayload(): Promise<Record<string, unknown>> {
  const [name, registrationCompleted, totalOrders, latestCartValue] =
    await Promise.all([
      getProfileName(),
      getRegistrationCompleted(),
      getTotalOrders(),
      getLatestCartValue(),
    ]);

  const payload: Record<string, unknown> = {
    ...CHANNEL_REQUIRED_FIELDS,
    registration_completed: registrationCompleted,
    total_orders: totalOrders,
    'latest-cart-value': latestCartValue,
  };

  if (name.trim()) {
    payload.name = name.trim();
  }

  return payload;
}
