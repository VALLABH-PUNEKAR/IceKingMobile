import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { useNotificationGenerator } from '../middleware/notification-context';

export function PushNotificationTrigger() {
  const { generateNotification, isReady, isGenerating } = useNotificationGenerator();
  const [result, setResult] = useState<string | null>(null);

  const handlePress = async () => {
    const { notification } = await generateNotification({
      scenario: 'New Flavor',
      product: 'Blue Velvet Cloud',
      category: 'Ice Cream',
      customer_type: 'New',
      user_activity: 'Browsing',
      time_of_day: 'Afternoon',
      day_type: 'Weekday',
      season: 'Spring',
      weather: 'Clear',
      discount: '15%',
      urgency: 'Medium',
      tone: 'Exciting',
      emoji: '☁️',
    });
    setResult(notification);
  };

  return (
    <View style={{ padding: 16 }}>
      <Button
        title={isGenerating ? 'Generating…' : 'Generate notification'}
        onPress={handlePress}
        disabled={!isReady || isGenerating}
      />
      {result && <Text style={{ marginTop: 12 }}>{result}</Text>}
    </View>
  );
}
