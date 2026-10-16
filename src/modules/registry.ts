import React from 'react';
import { IntervalAlarmScreen } from './interval-alarm/IntervalAlarmScreen';

export interface MiniAppModule {
  id: string;
  name: string;
  component: React.ComponentType;
}

/**
 * Registry of available modules. Currently defaults strictly to Interval Alarm
 * so that no secondary menus or distractions are displayed.
 */
export const MiniAppRegistry: MiniAppModule[] = [
  {
    id: 'interval_alarm',
    name: 'Alarming',
    component: IntervalAlarmScreen,
  },
];

export const getActiveModule = (): React.ComponentType => {
  return MiniAppRegistry[0].component;
};
