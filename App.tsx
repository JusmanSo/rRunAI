import React from "react";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./app/navigation/AppNavigator";

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
