import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

function decodeHtmlEntity(entity: string) {
  if (!entity) return '';
  return entity.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
}
export default function TooltipPoll({
  line1,
  line2,
  line1Icon,
  line1Color,
  line2Color,
  line1FontSize,
  line2FontSize,
  tooltipKey,
}: any) {
  const [visible, setVisible] = useState(true);

  // Reset visibility whenever a new tooltip is triggered

  useEffect(() => {
    if (tooltipKey) setVisible(true);
  }, [tooltipKey]);

  if (!visible) return null;

  return (
    <View
      style={{
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
        position: 'absolute',
        top: -50,
        zIndex: 999,
        minWidth: 150,
      }}
    >
      {/* Close button */}
      <TouchableOpacity
        onPress={() => setVisible(false)}
        style={{ position: 'absolute', top: 4, right: 4, zIndex: 1000 }}
      >
        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>×</Text>
      </TouchableOpacity>

      <Text
        style={{
          color: line1Color,
          fontSize: line1FontSize,
          fontWeight: 'bold',
        }}
      >
        {line1Icon ? `${decodeHtmlEntity(line1Icon)} ` : ''}
        {line1}
      </Text>
      <Text
        style={{
          color: line2Color,
          fontSize: line2FontSize,
          marginTop: 4,
        }}
      >
        {line2}
      </Text>
    </View>
  );
}
