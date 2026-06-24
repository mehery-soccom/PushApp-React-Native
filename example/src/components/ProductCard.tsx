import { View, Text, Button, StyleSheet } from 'react-native';
import type { Product } from '../data/products';

type ProductCardProps = {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
};

export function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
}: ProductCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{product['item-name']}</Text>
      <Text style={styles.meta}>Category: {product.productCategory}</Text>
      <Text style={styles.meta}>ID: {product.productId}</Text>
      <Text style={styles.price}>Price: ₹{product.price}</Text>
      <Text style={styles.mrp}>MRP: ₹{product.mrp}</Text>
      <Text style={styles.meta}>Value: ₹{product['product-value']}</Text>
      <View style={styles.qtyRow}>
        <Button title="−" onPress={onRemove} disabled={quantity === 0} />
        <Text style={styles.qty}>{quantity}</Text>
        <Button title="+" onPress={onAdd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  mrp: {
    fontSize: 13,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 12,
  },
  qty: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center',
  },
});
