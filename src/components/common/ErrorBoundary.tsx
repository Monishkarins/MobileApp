/**
 * App-wide render safety net. A single uncaught render error anywhere in the
 * tree (e.g. a screen choking on an unexpected API shape after the operator
 * switches customers) would otherwise unmount everything and leave a blank
 * white screen. This boundary contains the failure to one tab and offers a
 * retry instead of bricking the whole app.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Bumping this value (e.g. the selected customerId) auto-clears a prior error
   *  so switching context recovers without a manual retry tap. */
  resetKey?: string | number;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong',
    };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Clear the error when the reset key changes (e.g. a new customer is picked)
    // so the subtree re-mounts and re-fetches cleanly instead of staying stuck.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: undefined });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{this.props.label ?? 'This screen ran into a problem'}</Text>
        {this.state.message ? (
          <Text style={styles.message} numberOfLines={3}>{this.state.message}</Text>
        ) : null}
        <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.8}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing[8],
  },
  icon:    { fontSize: 44, marginBottom: Spacing[4] },
  title:   { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  message: { fontSize: FontSize.sm, color: Colors.text.subtle, textAlign: 'center', marginTop: Spacing[2] },
  btn: {
    marginTop: Spacing[5],
    backgroundColor: Colors.yellow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
  },
  btnText: { color: Colors.navy, fontSize: FontSize.base, fontWeight: '700' },
});
