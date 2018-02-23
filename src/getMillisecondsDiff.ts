import * as moment from 'moment';

/**
 * Gets milliseconds difference
 */
export default (d1: Date, d2: Date): number => {
  return Math.abs(moment(d1).diff(moment(d2), 'milliseconds'));
};
