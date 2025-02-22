import React, { useState } from 'react';
import { Box, Button, Text, Flex, Container, Alert, AlertIcon } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useVideoStream } from '../hooks/useVideoStream';

const MotionBox = motion(Box);

export const VideoStream: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const { 
    videoRef, 
    isStreaming, 
    streamError, 
    analysis, 
    startStream, 
    stopStream 
  } = useVideoStream();

  const handleToggleStream = async () => {
    if (isStreaming) {
      stopStream();
      setIsActive(false);
    } else {
      try {
        await startStream();
        setIsActive(true);
      } catch (error) {
        console.error('Failed to start video stream:', error);
      }
    }
  };

  return (
    <Container maxW="1200px" p={4}>
      <Flex direction="column" gap={4}>
        {/* Video Container */}
        <MotionBox
          position="relative"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxHeight: '70vh',
              objectFit: 'cover',
              borderRadius: '0.5rem',
            }}
          />

          {/* Analysis Overlay */}
          {analysis && (
            <MotionBox
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              p={4}
              bg="rgba(0, 0, 0, 0.7)"
              color="white"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Text fontSize="sm">{analysis}</Text>
            </MotionBox>
          )}
        </MotionBox>

        {/* Controls */}
        <Flex justify="center" gap={4}>
          <Button
            onClick={handleToggleStream}
            colorScheme={isStreaming ? 'red' : 'green'}
            size="lg"
          >
            <Box as="span" mr={2} fontSize="1.5em">
              {isStreaming ? '⏹' : '▶'}
            </Box>
            {isStreaming ? 'Stop Stream' : 'Start Stream'}
          </Button>
        </Flex>

        {/* Error Display */}
        {streamError && (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert status="error">
              <AlertIcon />
              {streamError}
            </Alert>
          </MotionBox>
        )}
      </Flex>
    </Container>
  );
};
