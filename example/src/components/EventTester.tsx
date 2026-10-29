import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Pressable,
  StyleSheet,
} from 'react-native';
import { sendCustomEvent } from 'react-native-mehery-event-sender';
import {
  EVENT_NAMES,
  EVENT_PROPERTY_SCHEMAS,
  MANUAL_EVENT_OPTIONS,
  type CommerceEventName,
} from '../constants/events';
import { getLatestCartValue } from '../utils/cartStorage';
import type { ManagedItemData, ManagedOp } from '../utils/managedEvents';

function numOrUndefined(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Build managed event_data.ops from the form fields (managed-events-sdk.md). */
function buildManagedPayload(
  eventName: CommerceEventName,
  formValues: Record<string, string>
): Record<string, unknown> {
  const get = (key: string) => formValues[key]?.trim() ?? '';

  if (eventName === EVENT_NAMES.addToCart) {
    const item: ManagedItemData = {
      item_id: get('item_id'),
      item_name: get('item_name') || undefined,
      item_brand: get('item_brand') || undefined,
      item_category: get('item_category') || undefined,
      price: numOrUndefined(get('price')),
      original_price: numOrUndefined(get('original_price')),
      quantity: numOrUndefined(get('quantity')),
      sku: get('item_id') || undefined,
    };
    const ops: ManagedOp[] = [{ objectType: 'CART_ITEM', data: { ...item } }];
    return {
      ...item,
      value: numOrUndefined(get('value')),
      currency: 'INR',
      ops,
    };
  }

  if (eventName === EVENT_NAMES.removeFromCart) {
    const itemId = get('item_id');
    const quantity = numOrUndefined(get('quantity')) ?? 0;
    const value = numOrUndefined(get('value'));

    if (quantity <= 0) {
      const ops: ManagedOp[] = [
        {
          objectType: 'CART_ITEM',
          objectOperation: 'DELETE',
          data: { item_id: itemId },
        },
      ];
      return { item_id: itemId, value, currency: 'INR', ops };
    }

    const item: ManagedItemData = {
      item_id: itemId,
      quantity,
      sku: itemId || undefined,
    };
    const ops: ManagedOp[] = [{ objectType: 'CART_ITEM', data: { ...item } }];
    return { ...item, value, currency: 'INR', ops };
  }

  if (eventName === EVENT_NAMES.orderPlaced) {
    const orderId = get('order_id');
    const value = numOrUndefined(get('value'));
    const line: ManagedItemData = {
      item_id: get('item_id'),
      item_name: get('item_name') || undefined,
      item_brand: get('item_brand') || undefined,
      price: numOrUndefined(get('price')),
      quantity: numOrUndefined(get('quantity')),
      sku: get('item_id') || undefined,
    };
    const orderData = {
      order_id: orderId,
      value,
      currency: 'INR',
      items: [line],
    };
    const ops: ManagedOp[] = [{ objectType: 'ORDER', data: { ...orderData } }];
    return { ...orderData, ops };
  }

  // view_cart — regular payload with managed item keys (no ops)
  return {
    item_id: get('item_id'),
    item_name: get('item_name') || undefined,
    item_brand: get('item_brand') || undefined,
    item_category: get('item_category') || undefined,
    price: numOrUndefined(get('price')),
    quantity: numOrUndefined(get('quantity')),
    value: numOrUndefined(get('value')),
    currency: 'INR',
  };
}

export function EventTester() {
  const [selectedEvent, setSelectedEvent] = useState<CommerceEventName>(
    MANUAL_EVENT_OPTIONS[0]!
  );
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const schema = EVENT_PROPERTY_SCHEMAS[selectedEvent] ?? [];

  useEffect(() => {
    const initForm = async () => {
      const latestCartValue = await getLatestCartValue();
      const initial: Record<string, string> = {};
      for (const field of EVENT_PROPERTY_SCHEMAS[selectedEvent]) {
        if (field.key === 'value') {
          initial[field.key] = String(latestCartValue);
        } else if (field.key === 'quantity') {
          initial[field.key] = '1';
        } else if (field.key === 'currency') {
          initial[field.key] = 'INR';
        } else {
          initial[field.key] = '';
        }
      }
      setFormValues(initial);
      setSendStatus(null);
    };
    initForm();
  }, [selectedEvent]);

  const requiredKeys =
    selectedEvent === EVENT_NAMES.removeFromCart
      ? ['item_id']
      : selectedEvent === EVENT_NAMES.orderPlaced
        ? ['order_id', 'item_id']
        : ['item_id'];

  const allFieldsFilled = requiredKeys.every(
    (key) => (formValues[key]?.trim() ?? '').length > 0
  );

  const handleSend = () => {
    if (!allFieldsFilled) return;

    const payload = buildManagedPayload(selectedEvent, formValues);
    sendCustomEvent(selectedEvent, payload);
    setSendStatus(`Sent ${selectedEvent} (managed ops attached)`);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Event tester</Text>
      <Text style={styles.hint}>
        Commerce events include event_data.ops (ORDER / CART_ITEM) per
        managed-events-sdk.md.
      </Text>
      <Text style={styles.label}>Select event</Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => setDropdownOpen((open) => !open)}
      >
        <Text style={styles.dropdownText}>{selectedEvent}</Text>
      </Pressable>

      {dropdownOpen ? (
        <View style={styles.dropdownList}>
          {MANUAL_EVENT_OPTIONS.map((eventName) => (
            <Pressable
              key={eventName}
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedEvent(eventName);
                setDropdownOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  eventName === selectedEvent && styles.dropdownItemSelected,
                ]}
              >
                {eventName}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.propertiesLabel}>Properties</Text>
      {schema.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={formValues[field.key] ?? ''}
            onChangeText={(text) =>
              setFormValues((prev) => ({ ...prev, [field.key]: text }))
            }
            keyboardType={
              field.keyboardType === 'numeric' ? 'numeric' : 'default'
            }
            placeholder={field.label}
          />
        </View>
      ))}

      <Button
        title="Send event"
        onPress={handleSend}
        disabled={!allFieldsFilled}
      />
      {sendStatus ? <Text style={styles.status}>{sendStatus}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 5,
    padding: 12,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 14,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  dropdownItemSelected: {
    fontWeight: '600',
    color: '#0066cc',
  },
  propertiesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  field: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    padding: 10,
    borderRadius: 5,
  },
  status: {
    marginTop: 10,
    fontSize: 13,
    color: '#333',
  },
});
