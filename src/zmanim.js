import {HDate} from './hdate';
import Sun from '@hebcal/solar-calc/lib/sun';

// eslint-disable-next-line require-jsdoc
function throwTypeError(error) {
  throw new TypeError(error);
}

/**
 * @typedef {Object} ZmanimTimesResult
 * @property {Date} dawn
 * @property {Date} dusk
 * @property {Date} goldenHour
 * @property {Date} goldenHourEnd
 * @property {Date} nauticalDawn
 * @property {Date} nauticalDusk
 * @property {Date} night
 * @property {Date} nightEnd
 * @property {Date} solarNoon
 * @property {Date} sunrise
 * @property {Date} sunriseEnd
 * @property {Date} sunset
 * @property {Date} sunsetStart
 * @property {Date} alotHaShachar
 * @property {Date} misheyakir
 * @property {Date} misheyakirMachmir
 * @property {Date} tzeit
*/

/** Class representing halachic times */
export class Zmanim {
  /**
     * Initialize a Zmanim instance.
     * @param {Date|HDate} date Regular or Hebrew Date. If `date` is a regular `Date`,
     *    hours, minutes, seconds and milliseconds are ignored.
     * @param {number} latitude
     * @param {number} longitude
     */
  constructor(date, latitude, longitude) {
    if (typeof latitude !== 'number') throw new TypeError('Invalid latitude');
    if (typeof longitude !== 'number') throw new TypeError('Invalid longitude');
    if (latitude < -90 || latitude > 90) {
      throw new RangeError(`Latitude ${latitude} out of range [-90,90]`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new RangeError(`Longitude ${longitude} out of range [-180,180]`);
    }
    const dt = date instanceof Date ? date :
        HDate.isHDate(date) ? date.greg() :
        throwTypeError(`invalid date: ${date}`);
    // reset the date to midday before calling solar-calc api
    this.date = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0, 0, 0);
    this.sun = new Sun(this.date, latitude, longitude);
    this.latitude = latitude;
    this.longitude = longitude;
  }
  /** @return {ZmanimTimesResult} */
  suntime() {
    return {
      solarNoon: this.sun.solarNoon,
      sunrise: this.sunrise(),
      sunset: this.sunset(),
      sunriseEnd: this.sun.timeAtAngle(0.3, true),
      sunsetStart: this.sun.timeAtAngle(0.3, false),
      dawn: this.dawn(),
      dusk: this.dusk(),
      nauticalDawn: this.sun.timeAtAngle(12, true),
      nauticalDusk: this.sun.timeAtAngle(12, false),
      nightEnd: this.sun.timeAtAngle(18, true),
      night: this.sun.timeAtAngle(18, false),
      goldenHourEnd: this.sun.timeAtAngle(-6, true),
      goldenHour: this.sun.timeAtAngle(-6, false),
      alotHaShachar: this.alotHaShachar(),
      misheyakir: this.misheyakir(),
      misheyakirMachmir: this.misheyakirMachmir(),
      tzeit: this.tzeit(),
    };
  }
  /** @return {Date} */
  sunrise() {
    return this.sun.timeAtAngle(0.833333, true);
  }
  /** @return {Date} */
  sunset() {
    return this.sun.timeAtAngle(0.833333, false);
  }
  /** @return {Date} */
  dawn() {
    return this.sun.timeAtAngle(6, true);
  }
  /** @return {Date} */
  dusk() {
    return this.sun.timeAtAngle(6, false);
  }
  /** @return {number} */
  hour() {
    return (this.sunset() - this.sunrise()) / 12; // ms in hour
  }
  /** @return {number} */
  hourMins() {
    // hour in ms / (1000 ms in s * 60 s in m) = mins in halachic hour
    return this.hour() / (1000 * 60);
  }
  /** @return {Date} */
  gregEve() {
    const prev = new Date(this.date.getTime() - 24 * 60 * 60 * 1000);
    const zman = new Zmanim(prev, this.latitude, this.longitude);
    return zman.sunset();
  }
  /** @return {number} */
  nightHour() {
    return (this.sunrise() - this.gregEve()) / 12; // ms in hour
  }
  /** @return {number} */
  nightHourMins() {
    // hour in ms / (1000 ms in s * 60 s in m) = mins in halachic hour
    return this.nightHour() / (1000 * 60);
  }
  /**
     * @param {number} hours
     * @return {Date}
     */
  hourOffset(hours) {
    return new Date(this.sunrise().getTime() + (this.hour() * hours));
  }
  /** @return {Date} */
  chatzot() {
    return this.hourOffset(6);
  }
  /** @return {Date} */
  chatzotNight() {
    return new Date(this.sunrise().getTime() - (this.nightHour() * 6));
  }
  /** @return {Date} */
  alotHaShachar() {
    return this.sun.timeAtAngle(16.1, true);
  }
  /** @return {Date} */
  misheyakir() {
    return this.sun.timeAtAngle(11.5, true);
  }
  /** @return {Date} */
  misheyakirMachmir() {
    return this.sun.timeAtAngle(10.2, true);
  }
  /** @return {Date} */
  sofZmanShma() { // Gra
    return this.hourOffset(3);
  }
  /** @return {Date} */
  sofZmanTfilla() { // Gra
    return this.hourOffset(4);
  }
  /** @return {Date} */
  minchaGedola() {
    return this.hourOffset(6.5);
  }
  /** @return {Date} */
  minchaKetana() {
    return this.hourOffset(9.5);
  }
  /** @return {Date} */
  plagHaMincha() {
    return this.hourOffset(10.75);
  }
  /**
   * @param {number} [angle=8.5] optional time for solar depression.
   *   Default is 8.5 degrees for 3 small stars, use 7.083 degress for 3 medium-sized stars.
   * @return {Date}
   */
  tzeit(angle=8.5) {
    return this.sun.timeAtAngle(angle, false);
  }
  /** @return {Date} */
  neitzHaChama() {
    return this.sunrise();
  }
  /** @return {Date} */
  shkiah() {
    return this.sunset();
  }

  /**
   * Uses timeFormat to return a date like '20:34'
   * @param {Date} dt
   * @param {Intl.DateTimeFormat} timeFormat
   * @return {string}
   */
  static formatTime(dt, timeFormat) {
    const time = timeFormat.format(dt);
    const hm = time.split(':');
    if (hm[0] === '24') {
      return '00:' + hm[1];
    }
    return time;
  }

  /**
   * Discards seconds, rounding to nearest minute. Returns 24-hour formatted time.
   * @param {Date} dt
   * @param {Intl.DateTimeFormat} timeFormat
   * @return {string}
   */
  static roundAndFormatTime(dt, timeFormat) {
    const millis = dt.getTime();
    if (isNaN(millis)) {
      return null;
    }
    // Round up to next minute if needed
    const sec = dt.getSeconds();
    const secondsDelta = (sec >= 30) ? 60 - sec : -1 * sec;
    const dtRounded = new Date(millis + (secondsDelta * 1000));
    return Zmanim.formatTime(dtRounded, timeFormat);
  }

  /**
   * Returns sunset + offset (either positive or negative).
   * @param {number} offset
   * @return {Date}
   */
  sunsetOffset(offset) {
    const sunset = this.sunset();
    if (isNaN(sunset.getTime())) {
      return sunset;
    }
    // For Havdalah only, round up to next minute if needed
    if (offset > 0 && sunset.getSeconds() >= 30) {
      offset++;
    }
    sunset.setSeconds(0);
    return new Date(sunset.getTime() + (offset * 60 * 1000));
  }

  /**
   * Returns an array with sunset + offset Date object, and a 24-hour string formatted time.
   * @param {number} offset
   * @param {Intl.DateTimeFormat} timeFormat
   * @return {Object[]}
   */
  sunsetOffsetTime(offset, timeFormat) {
    const dt = this.sunsetOffset(offset);
    if (isNaN(dt.getTime())) {
      // `No sunset for ${location} on ${hd}`
      return [undefined, undefined];
    }
    const time = Zmanim.formatTime(dt, timeFormat);
    return [dt, time];
  }

  /**
   * Returns an array with tzeit Date object and a 24-hour string formatted time.
   * @param {number} angle time for solar depression.
   *   Default is 8.5 degrees for 3 small stars, use 7.083 degress for 3 medium-sized stars.
   * @param {Intl.DateTimeFormat} timeFormat
   * @return {Object[]}
   */
  tzeitTime(angle, timeFormat) {
    const dt = this.tzeit(angle);
    const time = Zmanim.roundAndFormatTime(dt, timeFormat);
    if (time === null) {
      return [undefined, undefined];
    }
    return [dt, time];
  }
}
