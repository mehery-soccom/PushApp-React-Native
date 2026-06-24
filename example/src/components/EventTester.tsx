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
  EVENT_PROPERTY_SCHEMAS,
  MANUAL_EVENT_OPTIONS,
  type CommerceEventName,
} from '../constants/events';
import { getLatestCartValue } from '../utils/cartStorage';

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
        if (field.key === 'latest-cart-value') {
          initial[field.key] = String(latestCartValue);
        } else {
          initial[field.key] = '';
        }
      }
      setFormValues(initial);
      setSendStatus(null);
    };
    initForm();
  }, [selectedEvent]);

  const allFieldsFilled = schema.every(
    (field) => (formValues[field.key]?.trim() ?? '').length > 0
  );

  const handleSend = () => {
    if (!allFieldsFilled) return;

    const payload: Record<string, string | number> = {};
    for (const field of schema) {
      const raw = formValues[field.key]?.trim() ?? '';
      if (field.keyboardType === 'numeric') {
        payload[field.key] = Number(raw);
      } else {
        payload[field.key] = raw;
      }
    }

    sendCustomEvent(selectedEvent, payload);
    setSendStatus(`Sent ${selectedEvent}`);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Event tester</Text>
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
