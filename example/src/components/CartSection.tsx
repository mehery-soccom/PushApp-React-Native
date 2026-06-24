import { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import {
  sendCustomEvent,
  updateUserProfile,
} from 'react-native-mehery-event-sender';
import { PRODUCTS, productEventPayload } from '../data/products';
import {
  type CartItems,
  buildProfilePayload,
  clearCart,
  getCartItems,
  incrementTotalOrders,
  persistCart,
} from '../utils/cartStorage';
import { EVENT_NAMES } from '../constants/events';
import { ProductCard } from './ProductCard';

type CartSectionProps = {
  onProfileSync?: (status: string) => void;
};

export function CartSection({ onProfileSync }: CartSectionProps) {
  const [cartItems, setCartItems] = useState<CartItems>({});
  const [cartTotal, setCartTotal] = useState(0);
  const [cartVisible, setCartVisible] = useState(false);

  const loadCart = useCallback(async () => {
    const items = await getCartItems();
    const total = await persistCart(items);
    setCartItems(items);
    setCartTotal(total);
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleAdd = async (productId: string) => {
    const product = PRODUCTS.find((p) => p.productId === productId);
    if (!product) return;

    const next: CartItems = {
      ...cartItems,
      [productId]: (cartItems[productId] ?? 0) + 1,
    };
    const total = await persistCart(next);
    setCartItems(next);
    setCartTotal(total);
    sendCustomEvent(
      EVENT_NAMES.addToCart,
      productEventPayload(product, total)
    );
  };

  const handleRemove = async (productId: string) => {
    const currentQty = cartItems[productId] ?? 0;
    if (currentQty <= 0) return;

    const product = PRODUCTS.find((p) => p.productId === productId);
    if (!product) return;

    const next: CartItems = { ...cartItems };
    if (currentQty === 1) {
      delete next[productId];
    } else {
      next[productId] = currentQty - 1;
    }
    const total = await persistCart(next);
    setCartItems(next);
    setCartTotal(total);
    sendCustomEvent(
      EVENT_NAMES.removeFromCart,
      productEventPayload(product, total)
    );
  };

  const handleViewCart = () => {
    const lineItems = Object.entries(cartItems).filter(([, qty]) => qty > 0);
    if (lineItems.length === 0) {
      Alert.alert('Cart empty', 'Add products before viewing cart.');
      return;
    }

    setCartVisible(true);
    for (const [productId] of lineItems) {
      const product = PRODUCTS.find((p) => p.productId === productId);
      if (!product) continue;
      sendCustomEvent(
        EVENT_NAMES.viewCart,
        productEventPayload(product, cartTotal)
      );
    }
  };

  const handlePlaceOrder = async () => {
    const lineItems = Object.entries(cartItems).filter(([, qty]) => qty > 0);
    if (lineItems.length === 0) {
      Alert.alert('Cart empty', 'Add products before placing an order.');
      return;
    }

    const orderId = `ORD-${Date.now()}`;
    sendCustomEvent(EVENT_NAMES.orderPlaced, {
      orderId,
      'latest-cart-value': cartTotal,
    });

    await incrementTotalOrders();
    await clearCart();
    setCartItems({});
    setCartTotal(0);
    setCartVisible(false);

    onProfileSync?.('Updating profile after order…');
    try {
      const result = await updateUserProfile(await buildProfilePayload());
      onProfileSync?.(
        result.skipped
          ? `Order placed — profile sync skipped. ${result.message}`
          : `Order placed — profile sync sent. ${result.message}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onProfileSync?.(`Order placed — profile sync failed: ${message}`);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Products</Text>
      {PRODUCTS.map((product) => (
        <ProductCard
          key={product.productId}
          product={product}
          quantity={cartItems[product.productId] ?? 0}
          onAdd={() => handleAdd(product.productId)}
          onRemove={() => handleRemove(product.productId)}
        />
      ))}

      <Text style={styles.total}>Cart total: ₹{cartTotal}</Text>

      <Button title="View Cart" onPress={handleViewCart} />
      <View style={styles.spacer} />
      <Button title="Place Order" onPress={handlePlaceOrder} />

      {cartVisible ? (
        <View style={styles.cartSummary}>
          <Text style={styles.subheading}>Cart contents</Text>
          {Object.entries(cartItems)
            .filter(([, qty]) => qty > 0)
            .map(([productId, qty]) => {
              const product = PRODUCTS.find((p) => p.productId === productId);
              if (!product) return null;
              return (
                <Text key={productId} style={styles.lineItem}>
                  {product['item-name']} × {qty} — ₹{product.price * qty}
                </Text>
              );
            })}
          <Text style={styles.total}>Total: ₹{cartTotal}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  total: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 12,
  },
  spacer: { height: 12 },
  cartSummary: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  lineItem: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
});
