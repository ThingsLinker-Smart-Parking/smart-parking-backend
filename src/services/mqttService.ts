import mqtt, { MqttClient } from 'mqtt';
import { AppDataSource } from '../data-source';
import { Node } from '../models/Node';
import { ParkingStatusLog } from '../models/ParkingStatusLog';
import { logger } from './loggerService';
import { env } from '../config/environment';

interface ChirpStackUplink {
  deduplicationId: string;
  time: string;
  deviceInfo: {
    tenantId: string;
    tenantName: string;
    applicationId: string;
    applicationName: string;
    deviceProfileId: string;
    deviceProfileName: string;
    deviceName: string;
    devEui: string;
    deviceClassEnabled: string;
    tags: Record<string, any>;
  };
  devAddr: string;
  adr: boolean;
  dr: number;
  fCnt: number;
  fPort: number;
  confirmed: boolean;
  data: string;
  object: {
    distance_cm: number;
    state: 'FREE' | 'OCCUPIED';
  };
  rxInfo: Array<{
    gatewayId: string;
    uplinkId: number;
    nsTime: string;
    rssi: number;
    snr: number;
    channel: number;
    location: Record<string, any>;
    context: string;
    crcStatus: string;
  }>;
  txInfo: {
    frequency: number;
    modulation: {
      lora: {
        bandwidth: number;
        spreadingFactor: number;
        codeRate: string;
      };
    };
  };
  regionConfigId: string;
}

export class MqttService {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  constructor() {
    this.setupMqtt();
  }

  private setupMqtt(): void {
    if (!env.MQTT_BROKER_URL) {
      logger.warn('MQTT broker URL not configured, skipping MQTT setup');
      return;
    }

    try {
      const mqttOptions: mqtt.IClientOptions = {
        clientId: env.MQTT_CLIENT_ID || `smart-parking-backend-${Date.now()}`,
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: this.reconnectInterval,
        keepalive: 60,
      };

      this.client = mqtt.connect(env.MQTT_BROKER_URL, mqttOptions);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        logger.info('MQTT connected successfully', {
          broker: env.MQTT_BROKER_URL,
          clientId: mqttOptions.clientId
        });

        // Subscribe to ChirpStack application topics
        // Topic pattern: application/{applicationId}/device/+/event/up
        const topic = 'application/+/device/+/event/up';

        this.client!.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            logger.error('MQTT subscription failed', err);
          } else {
            logger.info('MQTT subscribed to ChirpStack uplink topic', { topic });
          }
        });
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        logger.error('MQTT connection error', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('MQTT connection closed');
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
        logger.warn('MQTT disconnected');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.info('MQTT attempting to reconnect', {
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts
        });

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max MQTT reconnect attempts reached, stopping client');
          this.client?.end();
        }
      });

    } catch (error) {
      logger.error('Failed to setup MQTT client', error);
    }
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const messageString = message.toString();
      logger.debug('MQTT message received', {
        topic,
        messageLength: messageString.length
      });

      // Parse ChirpStack uplink data
      const uplinkData: ChirpStackUplink = JSON.parse(messageString);

      // Validate required fields
      if (!uplinkData.deviceInfo?.devEui || !uplinkData.object) {
        logger.warn('Invalid ChirpStack uplink data - missing required fields', {
          topic,
          hasDevEui: !!uplinkData.deviceInfo?.devEui,
          hasObject: !!uplinkData.object
        });
        return;
      }

      await this.processChirpStackData(uplinkData);

    } catch (error) {
      logger.error('Error processing MQTT message', error, {
        topic,
        messagePreview: message.toString().substring(0, 200)
      });
    }
  }

  private async processChirpStackData(data: ChirpStackUplink): Promise<void> {
    try {
      const nodeRepository = AppDataSource.getRepository(Node);
      const statusLogRepository = AppDataSource.getRepository(ParkingStatusLog);

      // Find node by ChirpStack device EUI
      const node = await nodeRepository.findOne({
        where: {
          chirpstackDeviceId: data.deviceInfo.devEui
        },
        relations: ['parkingSlot']
      });

      if (!node) {
        logger.warn('Node not found for ChirpStack device', {
          devEui: data.deviceInfo.devEui,
          applicationId: data.deviceInfo.applicationId
        });
        return;
      }

      // Extract sensor data
      const distance = data.object.distance_cm;
      const sensorState = data.object.state;

      // Convert distance to percentage (assuming max distance of 200cm for parking slot)
      const maxDistance = 200;
      const percentage = Math.min(100, Math.max(0, (distance / maxDistance) * 100));

      // Extract gateway information
      const gatewayInfo = data.rxInfo[0]; // Use first gateway
      const batteryLevel = this.extractBatteryLevel(data);
      const signalQuality = this.calculateSignalQuality(gatewayInfo.rssi, gatewayInfo.snr);

      // Update node metadata with latest sensor data
      const updatedMetadata = {
        ...node.metadata,
        distance_cm: distance,
        percentage: percentage,
        state: sensorState,
        batteryLevel: batteryLevel,
        rssi: gatewayInfo.rssi,
        snr: gatewayInfo.snr,
        signalQuality: signalQuality,
        gatewayId: gatewayInfo.gatewayId,
        frequency: data.txInfo.frequency,
        spreadingFactor: data.txInfo.modulation.lora.spreadingFactor,
        frameCounter: data.fCnt,
        lastChirpStackUpdate: data.time,
        lastUpdated: new Date().toISOString()
      };

      // Update node
      node.metadata = updatedMetadata;
      node.lastSeen = new Date(data.time);
      await nodeRepository.save(node);

      // Determine parking slot status based on sensor state and percentage
      let slotStatus: 'available' | 'occupied' | 'unknown' = 'unknown';

      if (sensorState === 'FREE') {
        slotStatus = 'available';
      } else if (sensorState === 'OCCUPIED') {
        slotStatus = 'occupied';
      } else {
        // Fallback to percentage-based logic
        if (percentage >= 80) {
          slotStatus = 'available';
        } else if (percentage < 60) {
          slotStatus = 'occupied';
        }
      }

      // Log parking status change
      if (node.parkingSlot) {
        await statusLogRepository.save({
          parkingSlot: node.parkingSlot,
          status: slotStatus,
          distance: distance,
          percentage: percentage,
          batteryLevel: batteryLevel,
          signalQuality: signalQuality,
          metadata: {
            chirpstackData: {
              devEui: data.deviceInfo.devEui,
              gatewayId: gatewayInfo.gatewayId,
              rssi: gatewayInfo.rssi,
              snr: gatewayInfo.snr,
              frequency: data.txInfo.frequency,
              frameCounter: data.fCnt
            }
          }
        });

        logger.info('Parking slot status updated from ChirpStack', {
          nodeId: node.id,
          parkingSlotId: node.parkingSlot.id,
          devEui: data.deviceInfo.devEui,
          distance: distance,
          percentage: percentage,
          sensorState: sensorState,
          slotStatus: slotStatus,
          batteryLevel: batteryLevel,
          rssi: gatewayInfo.rssi,
          gatewayId: gatewayInfo.gatewayId
        });
      }

    } catch (error) {
      logger.error('Error processing ChirpStack data', error, {
        devEui: data.deviceInfo?.devEui,
        applicationId: data.deviceInfo?.applicationId
      });
    }
  }

  private extractBatteryLevel(data: ChirpStackUplink): number | null {
    // Check if battery level is in the object data
    if ('battery' in data.object) {
      return (data.object as any).battery;
    }

    // Check if battery level is in device metadata
    if (data.deviceInfo.tags?.battery) {
      return parseFloat(data.deviceInfo.tags.battery);
    }

    // Estimate battery level based on signal quality (fallback)
    const gatewayInfo = data.rxInfo[0];
    if (gatewayInfo) {
      // Very rough estimation based on RSSI
      // This is a fallback - real battery data should come from the device
      const normalizedRssi = Math.max(-120, Math.min(-50, gatewayInfo.rssi));
      const batteryEstimate = ((normalizedRssi + 120) / 70) * 100;
      return Math.round(batteryEstimate);
    }

    return null;
  }

  private calculateSignalQuality(rssi: number, snr: number): 'excellent' | 'good' | 'fair' | 'poor' {
    // Calculate signal quality based on RSSI and SNR
    if (rssi >= -70 && snr >= 10) return 'excellent';
    if (rssi >= -85 && snr >= 5) return 'good';
    if (rssi >= -100 && snr >= 0) return 'fair';
    return 'poor';
  }

  // Public method to publish data (if needed for testing or manual updates)
  public publish(topic: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          logger.error('MQTT publish error', error);
          reject(error);
        } else {
          logger.debug('MQTT message published', { topic });
          resolve();
        }
      });
    });
  }

  // Get connection status
  public getStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Gracefully disconnect
  public async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, () => {
          logger.info('MQTT client disconnected gracefully');
          resolve();
        });
      });
    }
  }

  // Health check for MQTT service
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    details: any;
  }> {
    try {
      if (!env.MQTT_BROKER_URL) {
        return {
          status: 'degraded',
          details: {
            message: 'MQTT not configured',
            configured: false
          }
        };
      }

      if (this.isConnected) {
        return {
          status: 'healthy',
          details: {
            connected: true,
            broker: env.MQTT_BROKER_URL,
            reconnectAttempts: this.reconnectAttempts
          }
        };
      } else {
        return {
          status: 'unhealthy',
          details: {
            connected: false,
            broker: env.MQTT_BROKER_URL,
            reconnectAttempts: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
          }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Create singleton instance
export const mqttService = new MqttService();

// Export ChirpStack types for use in other modules
export type { ChirpStackUplink };