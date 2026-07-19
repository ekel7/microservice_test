import { DateTime } from 'luxon';

class WeatherService {
  constructor() {
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
    this.apiKey = import.meta.env.PUBLIC_OPENWEATHER_API_KEY;
    this.defaultLat = -34.6118; // Buenos Aires coordinates as default
    this.defaultLon = -58.3960;
  }

  async getCurrentWeather(lat = this.defaultLat, lon = this.defaultLon) {
    if (!this.apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    try {
      const response = await fetch(
        `${this.baseURL}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=es`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      
      const weatherData = {
        temp: data.main.temp,
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind?.speed || 0,
        icon: data.weather[0].icon,
        condition: this.getWeatherCondition(data.main.temp, data.weather[0].icon)
      };

      return weatherData;
    } catch (error) {
      console.error('Failed to fetch current weather:', error);
      throw error;
    }
  }

  async getWeeklyForecast(lat = this.defaultLat, lon = this.defaultLon) {
    if (!this.apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    try {
      const response = await fetch(
        `${this.baseURL}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=es`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Process forecast data to get daily summaries
      const dailyForecasts = this.processForecastData(data.list);
      
      return dailyForecasts;
    } catch (error) {
      console.error('Failed to fetch weather forecast:', error);
      throw error;
    }
  }

  processForecastData(forecastList) {
    const dailyData = {};
    
    forecastList.forEach(item => {
      const date = DateTime.fromSeconds(item.dt).toFormat('yyyy-MM-dd');
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date: date,
          temps: [],
          descriptions: [],
          icons: []
        };
      }
      
      dailyData[date].temps.push(item.main.temp);
      dailyData[date].descriptions.push(item.weather[0].description);
      dailyData[date].icons.push(item.weather[0].icon);
    });

    // Convert to array and calculate daily min/max
    return Object.values(dailyData)
      .slice(0, 7) // Get first 7 days
      .map(day => ({
        date: day.date,
        temp_min: Math.round(Math.min(...day.temps)),
        temp_max: Math.round(Math.max(...day.temps)),
        description: this.getMostFrequent(day.descriptions),
        icon: this.convertToDayIcon(this.getMostFrequent(day.icons))
      }));
  }

  convertToDayIcon(icon) {
    // Convert night icons to day icons for forecast
    // OpenWeatherMap icon codes: 'd' = day, 'n' = night
    if (icon && icon.endsWith('n')) {
      return icon.slice(0, -1) + 'd';
    }
    return icon;
  }

  getWeatherCondition(temperature, iconCode) {
    // Remove day/night suffix to get base icon code
    const baseIcon = iconCode ? iconCode.slice(0, 2) : '';
    
    // Check for bad weather conditions based on icon codes
    const badWeatherIcons = ['09', '10', '11', '13', '50']; // Rain, thunderstorm, snow, mist
    const isBadWeatherIcon = badWeatherIcons.includes(baseIcon);
    const isBadTemperature = temperature < 2 || temperature > 38;
    
    if (isBadWeatherIcon || isBadTemperature) {
      return 'bad';
    }
    
    // Check for perfect weather conditions
    const perfectWeatherIcons = ['01', '02']; // Clear sky, few clouds
    const isPerfectTemperature = temperature >= 18 && temperature <= 28;
    
    if (perfectWeatherIcons.includes(baseIcon) && isPerfectTemperature) {
      return 'perfect';
    }
    
    // Everything else is good weather (if temperature is reasonable)
    if (temperature >= 8 && temperature <= 32) {
      return 'good';
    }
    
    return 'neutral';
  }

  getMostFrequent(arr) {
    const frequency = {};
    let maxCount = 0;
    let mostFrequent = arr[0];

    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxCount) {
        maxCount = frequency[item];
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  async getWeatherData(lat, lon) {
    try {
      const [current, weekly] = await Promise.all([
        this.getCurrentWeather(lat, lon),
        this.getWeeklyForecast(lat, lon)
      ]);

      return {
        current,
        weekly
      };
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      throw error;
    }
  }

  // Get user's location
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error, using default location:', error);
          resolve({
            lat: this.defaultLat,
            lon: this.defaultLon
          });
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      );
    });
  }

  // Fallback weather data for when API is not available
  getFallbackWeatherData() {
    const today = DateTime.now();
    const weekly = [];
    const dayIcons = ['01d', '02d', '03d', '04d', '09d', '10d', '11d'];
    
    for (let i = 0; i < 7; i++) {
      const date = today.plus({ days: i });
      
      weekly.push({
        date: date.toFormat('yyyy-MM-dd'),
        temp_max: Math.round(20 + Math.random() * 10),
        temp_min: Math.round(10 + Math.random() * 8),
        description: 'partly cloudy',
        icon: dayIcons[Math.floor(Math.random() * dayIcons.length)]
      });
    }

    // For current weather, use day/night icon based on current time
    const currentHour = DateTime.now().hour;
    const isDaytime = currentHour >= 6 && currentHour < 20;
    const currentIcon = isDaytime ? '02d' : '02n';
    const currentTemp = Math.round(18 + Math.random() * 12);

    return {
      current: {
        temp: currentTemp,
        description: 'partly cloudy',
        humidity: 65,
        windSpeed: 5,
        icon: currentIcon,
        condition: this.getWeatherCondition(currentTemp, currentIcon)
      },
      weekly
    };
  }
}

export const weatherService = new WeatherService();
export default weatherService;