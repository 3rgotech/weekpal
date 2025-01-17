import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export const getWeekDates = (date: dayjs.Dayjs) => {    
    const startOfWeek = date.startOf('isoWeek').format('MMMM D, YYYY');
    const endOfWeek = date.endOf('isoWeek').format('MMMM D, YYYY');
    return { startOfWeek, endOfWeek };
};
