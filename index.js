// Entrada de la app. crypto.getRandomValues va ANTES que cualquier otro módulo: ver src/lib/shims/native-globals.native.ts.
import './src/lib/shims/native-globals';
import 'expo-router/entry';
