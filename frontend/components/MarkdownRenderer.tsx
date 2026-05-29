import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content by newline
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for fenced code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const codeText = codeBlockLines.join('\n');
        renderedElements.push(
          <View key={`code-${i}`} style={styles.codeBlock}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.codeBlockText}>{codeText}</Text>
            </ScrollView>
          </View>
        );
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        // Start of code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Handle empty lines as spacing gaps
    if (trimmed === '') {
      renderedElements.push(<View key={`gap-${i}`} style={styles.paragraphGap} />);
      continue;
    }

    // 1. Headers
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <Text key={`h1-${i}`} style={styles.h1}>
          {renderTextWithInlineStyles(trimmed.slice(2))}
        </Text>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <Text key={`h2-${i}`} style={styles.h2}>
          {renderTextWithInlineStyles(trimmed.slice(3))}
        </Text>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <Text key={`h3-${i}`} style={styles.h3}>
          {renderTextWithInlineStyles(trimmed.slice(4))}
        </Text>
      );
      continue;
    }

    // 2. Bullet Points
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
    if (isBullet) {
      const bulletText = trimmed.slice(2).trim();
      renderedElements.push(
        <View key={`bullet-${i}`} style={styles.bulletRow}>
          <View style={styles.bulletPoint}>
            <Ionicons name="sparkles-outline" size={10} color="#bc000a" />
          </View>
          <Text style={styles.bulletText}>
            {renderTextWithInlineStyles(bulletText)}
          </Text>
        </View>
      );
      continue;
    }

    // 3. Numbered List items (e.g., 1. item, 2. item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const rest = numMatch[2];
      renderedElements.push(
        <View key={`num-${i}`} style={styles.bulletRow}>
          <Text style={styles.numberPrefix}>{num}.</Text>
          <Text style={styles.bulletText}>
            {renderTextWithInlineStyles(rest)}
          </Text>
        </View>
      );
      continue;
    }

    // 4. Regular Paragraph
    renderedElements.push(
      <Text key={`p-${i}`} style={styles.paragraph}>
        {renderTextWithInlineStyles(line)}
      </Text>
    );
  }

  // Handle open-ended code block if the text ended without closing it
  if (inCodeBlock && codeBlockLines.length > 0) {
    const codeText = codeBlockLines.join('\n');
    renderedElements.push(
      <View key="code-eof" style={styles.codeBlock}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.codeBlockText}>{codeText}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.markdownContainer}>
      {renderedElements}
    </View>
  );
};

// Parser to support **bold**, *italic*, `inline code`, and [link](url) formatting
function renderTextWithInlineStyles(text: string) {
  const regex = /(\[.*?\]\(.+?\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const matches = text.split(regex);

  return matches.map((part, idx) => {
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const closeBracketIdx = part.indexOf('](');
      const linkText = part.slice(1, closeBracketIdx);
      const url = part.slice(closeBracketIdx + 2, -1);
      return (
        <Text
          key={idx}
          style={styles.linkText}
          onPress={() => {
            if (url.startsWith('http')) {
              Linking.openURL(url).catch((err) =>
                console.error('Failed to open link:', err)
              );
            }
          }}
        >
          {linkText}
        </Text>
      );
    }
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
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={idx} style={styles.inlineCode}>
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
    height: 8,
  },
  h1: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 18,
    color: '#1c1b1b',
    marginTop: 12,
    marginBottom: 4,
  },
  h2: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 16,
    color: '#bc000a',
    marginTop: 10,
    marginBottom: 4,
  },
  h3: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 14,
    color: '#1c1b1b',
    marginTop: 8,
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
  numberPrefix: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    color: '#bc000a',
    minWidth: 16,
    marginTop: 1,
  },
  bulletText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 20,
    color: '#1c1b1b',
    flex: 1,
  },
  boldText: {
    fontFamily: 'SpaceMono-Bold',
    color: '#1c1b1b',
  },
  italicText: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'SpaceMono-Bold',
    color: '#bc000a',
    fontSize: 12,
    backgroundColor: '#f0eded',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  codeBlock: {
    backgroundColor: '#f0eded',
    borderWidth: 1,
    borderColor: '#1c1b1b',
    padding: 10,
    marginVertical: 6,
    width: '100%',
  },
  codeBlockText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#bc000a',
    lineHeight: 18,
  },
  linkText: {
    fontFamily: 'SpaceMono-Bold',
    color: '#bc000a',
    textDecorationLine: 'underline',
  },
});
