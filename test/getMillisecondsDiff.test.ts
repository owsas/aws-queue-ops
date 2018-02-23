import * as moment from 'moment';
import getMillisecondsDiff from '../src/getMillisecondsDiff';

test('should get the right milliseconds', () => {
  const date1 = moment();
  const date2 = date1.clone().add(300, 'milliseconds');
  
  const diff = getMillisecondsDiff(date1.toDate(), date2.toDate());
  expect(diff).toEqual(300);
});
