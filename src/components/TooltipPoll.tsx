import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function decodeHtmlEntity(entity: string) {
  if (!entity) return '';
  return entity.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
}

interface TooltipPollProps {
  line1?: string;
  line2?: string;
  line1Icon?: string;
  line1Color?: string;
  line2Color?: string;
  line1FontSize?: number;
  line2FontSize?: number;
  tooltipKey?: string;
}

export default function TooltipPoll({
  line1 = '',
  line2 = '',
  line1Icon,
  line1Color,
  line2Color,
  line1FontSize,
  line2FontSize,
  tooltipKey,
}: TooltipPollProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (tooltipKey) setVisible(true);
  }, [tooltipKey]);

  if (!visible) return null;

  const line1Style = {
    color: line1Color || 'black',
    fontSize: line1FontSize || 14,
    fontWeight: 'bold' as const,
  };

  const line2Style = {
    color: line2Color || 'gray',
    fontSize: line2FontSize || 12,
    marginTop: 4,
  };

  return (
    <View style={styles.container}>
      <Text style={line1Style}>
        {line1Icon ? `${decodeHtmlEntity(line1Icon)} ` : ''}
        {line1}
      </Text>
      <Text style={line2Style}>{line2}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    position: 'absolute',
    top: 50,
    zIndex: 450,
    minWidth: 150,
    left: -140,
  },
});
