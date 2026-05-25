import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content by newline
  const lines = content.split('\n');

  return (
    <View style={styles.markdownContainer}>
      {lines.map((line, lineIdx) => {
        const cleanLine = line.trim();
        if (cleanLine === '') {
          return <View key={lineIdx} style={styles.paragraphGap} />;
        }

        // 1. Headers
        if (cleanLine.startsWith('# ')) {
          return (
            <Text key={lineIdx} style={styles.h1}>
              {renderTextWithInlineStyles(cleanLine.slice(2))}
            </Text>
          );
        }
        if (cleanLine.startsWith('## ')) {
          return (
            <Text key={lineIdx} style={styles.h2}>
              {renderTextWithInlineStyles(cleanLine.slice(3))}
            </Text>
          );
        }
        if (cleanLine.startsWith('### ')) {
          return (
            <Text key={lineIdx} style={styles.h3}>
              {renderTextWithInlineStyles(cleanLine.slice(4))}
            </Text>
          );
        }

        // 2. Bullet Points
        const isBullet = cleanLine.startsWith('- ') || cleanLine.startsWith('* ') || cleanLine.startsWith('• ');
        if (isBullet) {
          const bulletText = cleanLine.slice(2).trim();
          return (
            <View key={lineIdx} style={styles.bulletRow}>
              <View style={styles.bulletPoint}>
                <Ionicons name="sparkles-outline" size={10} color="#bc000a" />
              </View>
              <Text style={styles.bulletText}>
                {renderTextWithInlineStyles(bulletText)}
              </Text>
            </View>
          );
        }

        // 3. Regular Paragraph
        return (
          <Text key={lineIdx} style={styles.paragraph}>
            {renderTextWithInlineStyles(cleanLine)}
          </Text>
        );
      })}
    </View>
  );
};

// Parser to support **bold** and *italic* formatting
function renderTextWithInlineStyles(text: string) {
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  const matches = text.split(regex);

  return matches.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={idx} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={idx} style={styles.italicText}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}

const styles = StyleSheet.create({
  markdownContainer: {
    gap: 8,
    width: '100%',
  },
  paragraphGap: {
    height: 6,
  },
  h1: {
    fontFamily: 'SpaceMono',
    fontSize: 17,
    fontWeight: '700',
    color: '#1c1b1b',
    marginTop: 10,
    marginBottom: 4,
  },
  h2: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    fontWeight: '700',
    color: '#bc000a',
    marginTop: 8,
    marginBottom: 4,
  },
  h3: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1b1b',
    marginTop: 6,
    marginBottom: 2,
  },
  paragraph: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 20,
    color: '#1c1b1b',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
    gap: 8,
    marginVertical: 2,
    width: '100%',
  },
  bulletPoint: {
    marginTop: 5,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 20,
    color: '#1c1b1b',
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: '#1c1b1b',
  },
  italicText: {
    fontStyle: 'italic',
  },
});
