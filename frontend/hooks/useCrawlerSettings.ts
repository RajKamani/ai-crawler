import { useState, useEffect } from 'react';
import { API_BASE_URL, AUTH_HEADER } from '../constants/Config';

export interface CrawlerSchedule {
  id: string;
  crawler_name: string;
  interval_minutes: number;
  is_active: boolean;
  updated_at: string;
}

export const useCrawlerSettings = () => {
  const [schedules, setSchedules] = useState<CrawlerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/crawlers`, {
        headers: { ...AUTH_HEADER },
      });
      const data = await response.json();
      if (response.ok) {
        setSchedules(data.settings || []);
      }
    } catch (error) {
      console.error('Error fetching crawler settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSchedule = async (name: string, intervalMinutes?: number, isActive?: boolean) => {
    const body: Record<string, any> = {};
    if (intervalMinutes !== undefined) body.interval_minutes = intervalMinutes;
    if (isActive !== undefined) body.is_active = isActive;

    const response = await fetch(`${API_BASE_URL}/settings/crawlers/${name}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...AUTH_HEADER,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update crawler schedule');
    }

    setSchedules((prev) =>
      prev.map((sch) => (sch.crawler_name === name ? data.setting : sch))
    );
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return {
    schedules,
    isLoading,
    refresh: fetchSchedules,
    updateSchedule,
  };
};
