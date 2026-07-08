import { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { sendCustomEvent } from 'react-native-mehery-event-sender';
import { EVENT_NAMES } from '../constants/events';
import { appStyles } from '../styles/appStyles';

type LoginScreenProps = {
  onSignIn: (code: string) => Promise<void>;
  onSignUp: (code: string, name: string) => Promise<void>;
};

export function LoginScreen({ onSignIn, onSignUp }: LoginScreenProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode || loading) return;

    setLoading(true);
    try {
      await onSignIn(trimmedCode);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpPress = () => {
    setShowNameInput(true);
    setNameError(null);
  };

  const handleSignUp = async () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode || loading) return;

    if (!trimmedName) {
      setNameError('Name is required for Sign Up');
      setShowNameInput(true);
      return;
    }

    setNameError(null);
    setLoading(true);
    try {
      await onSignUp(trimmedCode, trimmedName);
    } finally {
      setLoading(false);
    }
  };

  const handlePreLoginButton = async (eventName: string) => {
    if (loading) return;
    await sendCustomEvent(eventName, {});
  };

  return (
    <View style={appStyles.container}>
      <Text style={appStyles.label}>Enter code:</Text>
      <TextInput
        style={appStyles.input}
        placeholder="user123"
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
      />

      {showNameInput ? (
        <>
          <Text style={appStyles.label}>Your name (Sign Up):</Text>
          <TextInput
            style={appStyles.input}
            placeholder="e.g. Jane Doe"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (text.trim()) setNameError(null);
            }}
            autoCapitalize="words"
          />
          {nameError ? <Text style={appStyles.errorText}>{nameError}</Text> : null}
        </>
      ) : null}

      <View style={appStyles.customEventButtons}>
        <Button
          title={loading ? 'Signing in…' : 'Sign In'}
          onPress={handleSignIn}
          disabled={loading}
        />
        <View style={appStyles.customEventButtonSpacer} />
        {!showNameInput ? (
          <Button
            title="Sign Up"
            onPress={handleSignUpPress}
            disabled={loading}
          />
        ) : (
          <Button
            title={loading ? 'Signing up…' : 'Complete Sign Up'}
            onPress={handleSignUp}
            disabled={loading}
          />
        )}
        <View style={appStyles.customEventButtonSpacer} />
        <Button
          title="jr_pre_login_button_1"
          onPress={() => handlePreLoginButton(EVENT_NAMES.preLoginButton1)}
          disabled={loading}
        />
        <View style={appStyles.customEventButtonSpacer} />
        <Button
          title="jr_pre_login_button_2"
          onPress={() => handlePreLoginButton(EVENT_NAMES.preLoginButton2)}
          disabled={loading}
        />
      </View>
    </View>
  );
}
