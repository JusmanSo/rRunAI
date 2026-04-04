import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import RunScreen from "../screens/RunScreen";
import SummaryScreen from "../screens/SummaryScreen";

// Import the Session type so we can include it in navigation params.
import type { Session } from "../types/session";

/**
 * Central type definition for all screens and their params.
 *
 * WHAT CHANGED:
 *   - "Run" now requires a `session` object so the coaching engine
 *     knows what pace range to target.
 *   - "Summary" also receives the `session` so it can display the
 *     session name on the post-run screen.
 */
export type RootStackParamList = {
  Home: undefined;
  Run: { session: Session };
  Summary: { elapsedSeconds: number; distanceKm: number; session: Session };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Run" component={RunScreen} />
        <Stack.Screen name="Summary" component={SummaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
