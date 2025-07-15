"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { MapPin, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface DateInfo {
  gregorian: {
    date: string;
    weekday: { en: string };
    month: { en: string; number: number };
    year: string;
    day: string;
  };
  hijri: {
    date: string;
    month: { en: string; ar: string; number: number };
    year: string;
    day: string;
  };
}

interface PrayerData {
  timings: PrayerTimes;
  date: DateInfo;
}

const prayerNamesEn = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const prayerNamesAr = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];

const monthsEn = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthsAr = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const convertToArabicNumbers = (text: string): string => {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return text.replace(
    /[0-9]/g,
    (digit) => arabicNumbers[Number.parseInt(digit)]
  );
};

export default function SakeenaPrayerTimes() {
  const [isArabic, setIsArabic] = useState(() => {
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("language");
      return savedLanguage === "arabic";
    }
    return false;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
  const [monthlyData, setMonthlyData] = useState<PrayerData[]>([]);
  const [location, setLocation] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [nextPrayer, setNextPrayer] = useState<string>("");
  const [isRamadan, setIsRamadan] = useState(false);

  const formatLocation = (loc: string) => {
    return isArabic ? convertToArabicNumbers(loc) : loc;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              await fetchPrayerTimesByCoordinates(latitude, longitude);
            },
            () => {
              setCity("Cairo");
              setCountry("Egypt");
              fetchPrayerTimesByCity("Cairo", "Egypt");
            }
          );
        } else {
          setCity("Cairo");
          setCountry("Egypt");
          fetchPrayerTimesByCity("Cairo", "Egypt");
        }
      } catch (error) {
        console.error("Error getting location:", error);
        setCity("Cairo");
        setCountry("Egypt");
        fetchPrayerTimesByCity("Cairo", "Egypt");
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    if (prayerData) {
      updateNextPrayer();
    }
  }, [currentTime, prayerData]);

  const fetchPrayerTimesByCoordinates = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=5`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.data) {
        setPrayerData(data.data);
        setIsRamadan(data.data.date.hijri.month.number === 9);

        setLocation(`${lat.toFixed(2)}, ${lng.toFixed(2)}`);

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const monthResponse = await fetch(
          `https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lng}&method=5&month=${currentMonth}&year=${currentYear}`
        );
        if (!monthResponse.ok) {
          throw new Error(`HTTP error! status: ${monthResponse.status}`);
        }
        const monthData = await monthResponse.json();
        if (monthData.data) {
          setMonthlyData(monthData.data.slice(0, 30));
        }
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      setCity("Cairo");
      setCountry("Egypt");
      await fetchPrayerTimesByCity("Cairo", "Egypt");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrayerTimesByCity = async (
    cityName: string,
    countryName: string
  ) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${cityName}&country=${countryName}&method=5`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.data) {
        setPrayerData(data.data);
        setIsRamadan(data.data.date.hijri.month.number === 9);
        setLocation(`${cityName}, ${countryName}`);

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        await fetchMonthlyPrayerTimes(
          cityName,
          countryName,
          currentMonth,
          currentYear
        );
      }
    } catch (error) {
      console.error("Error fetching prayer times by city:", error);
      setLocation("Unable to fetch location");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyPrayerTimes = async (
    cityName: string,
    countryName: string,
    month: number,
    year: number
  ) => {
    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/calendarByCity?city=${cityName}&country=${countryName}&method=5&month=${month}&year=${year}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.data) {
        setMonthlyData(data.data.slice(0, 30));
      }
    } catch (error) {
      console.error("Error fetching monthly prayer times:", error);
    }
  };

  const updateNextPrayer = () => {
    if (!prayerData) return;

    const now = currentTime;
    const currentTimeStr = now.toTimeString().slice(0, 5);
    const prayers = prayerData.timings;

    const prayerTimes = [
      { name: "Fajr", time: prayers.Fajr },
      { name: "Dhuhr", time: prayers.Dhuhr },
      { name: "Asr", time: prayers.Asr },
      { name: "Maghrib", time: prayers.Maghrib },
      { name: "Isha", time: prayers.Isha },
    ];

    for (const prayer of prayerTimes) {
      if (currentTimeStr < prayer.time) {
        setNextPrayer(prayer.name);
        return;
      }
    }

    setNextPrayer("Fajr");
  };

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city && country) {
      fetchPrayerTimesByCity(city, country);
    }
  };

  const formatTime = (time24: string) => {
    const timeOnly = time24.split(" ")[0];
    const [hours, minutes] = timeOnly.split(":");
    const hour = Number.parseInt(hours);
    const ampm = hour >= 12 ? (isArabic ? "م" : "PM") : isArabic ? "ص" : "AM";
    const hour12 = hour % 12 || 12;
    const timeStr = `${hour12}:${minutes} ${ampm}`;
    return isArabic ? convertToArabicNumbers(timeStr) : timeStr;
  };

  const formatCurrentTime = () => {
    const hours = String(currentTime.getHours() % 12 || 12).padStart(2, "0");
    const minutes = String(currentTime.getMinutes()).padStart(2, "0");
    const seconds = String(currentTime.getSeconds()).padStart(2, "0");
    const ampm =
      currentTime.getHours() >= 12
        ? isArabic
          ? "م"
          : "PM"
        : isArabic
        ? "ص"
        : "AM";

    let formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;
    if (isArabic) {
      formattedTime = convertToArabicNumbers(formattedTime);
    }
    return formattedTime;
  };

  const getCurrentDate = () => {
    if (!prayerData) return { gregorian: "", hijri: "" };

    const greg = prayerData.date.gregorian;
    const hijri = prayerData.date.hijri;

    if (isArabic) {
      const gregorianDate = `${greg.day} ${monthsAr[greg.month.number - 1]} ${
        greg.year
      }`;
      const hijriDate = `${hijri.day} ${hijri.month.ar} ${hijri.year}`;
      return {
        gregorian: convertToArabicNumbers(gregorianDate),
        hijri: convertToArabicNumbers(hijriDate),
      };
    }

    return {
      gregorian: `${greg.day} ${greg.month.en} ${greg.year}`,
      hijri: `${hijri.day} ${hijri.month.en} ${hijri.year}`,
    };
  };

  const getTodayGregorianDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const todayGregorianDate = getTodayGregorianDate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-700">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const currentDate = getCurrentDate();

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-4`}>
              <h1 className="text-2xl font-bold text-emerald-800">
                {isArabic ? "سَكِينَة" : "Sakeena"}
              </h1>
              <Badge
                variant="outline"
                className="text-emerald-700 border-emerald-300"
              >
                <MapPin className={`w-3 h-3 ${isArabic ? "ml-1" : "mr-1"}`} />
                {formatLocation(location)}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newLanguage = !isArabic;
                setIsArabic(newLanguage);
                if (typeof window !== "undefined") {
                  localStorage.setItem(
                    "language",
                    newLanguage ? "arabic" : "english"
                  );
                }
              }}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Globe className={`w-4 h-4 ${isArabic ? "ml-2" : "mr-2"}`} />
              {isArabic ? "English" : "العربية"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {isRamadan && (
          <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0">
            <CardContent className="text-center py-6">
              <h2 className="text-2xl font-bold">
                {isArabic ? "رمضان مبارك" : "Ramadan Mubarak"}
              </h2>
              <p className="mt-2 opacity-90">
                {isArabic
                  ? "كل عام وأنتم بخير"
                  : "May this blessed month bring peace and blessings"}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
          <CardContent className="text-center py-6">
            <div className={`grid md:grid-cols-3 gap-4 items-center`}>
              <div>
                <p className="text-sm text-emerald-600 mb-1">
                  {isArabic ? "التاريخ الهجري" : "Hijri Date"}
                </p>
                <p className="text-lg font-semibold text-emerald-800">
                  {currentDate.hijri}
                </p>
              </div>

              <div className={`flex items-center justify-center`}>
                <div className="text-center">
                  <Clock className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-800">
                    {formatCurrentTime()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-emerald-600 mb-1">
                  {isArabic ? "التاريخ الميلادي" : "Gregorian Date"}
                </p>
                <p className="text-lg font-semibold text-emerald-800">
                  {currentDate.gregorian}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
          <CardHeader>
            <CardTitle className="text-center text-emerald-800">
              {isArabic ? "مواقيت الصلاة اليوم" : "Today's Prayer Times"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {prayerNamesEn.map((prayer, index) => (
                <div
                  key={prayer}
                  className={`text-center p-4 rounded-lg transition-all ${
                    nextPrayer === prayer
                      ? "bg-emerald-100 border-2 border-emerald-400 shadow-lg"
                      : "bg-emerald-50 border border-emerald-200"
                  }`}
                >
                  <h3 className="font-semibold text-emerald-800 mb-2">
                    {isArabic ? prayerNamesAr[index] : prayer}
                  </h3>
                  <p className="text-lg font-bold text-emerald-700">
                    {prayerData &&
                      formatTime(
                        prayerData.timings[prayer as keyof PrayerTimes]
                      )}
                  </p>
                  {nextPrayer === prayer && (
                    <Badge className="mt-2 bg-emerald-600">
                      {isArabic ? "الصلاة القادمة" : "Next Prayer"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
          <CardHeader>
            <CardTitle className="text-emerald-800">
              {isArabic ? "تغيير الموقع" : "Change Location"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCitySubmit} className="flex gap-4">
              <Input
                placeholder={isArabic ? "اسم البلد" : "Country name"}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="border-emerald-300 focus:border-emerald-500"
              />
              <Input
                placeholder={isArabic ? "اسم المدينة" : "City name"}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="border-emerald-300 focus:border-emerald-500"
              />
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isArabic ? "بحث" : "Search"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
          <CardHeader>
            <CardTitle className="text-emerald-800">
              {isArabic
                ? convertToArabicNumbers("مواقيت الصلاة لـ 30 يوم")
                : "30-Day Prayer Times"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className={`text-emerald-800 ${
                        isArabic ? "text-center" : ""
                      }`}
                    >
                      {isArabic ? "التاريخ الميلادي" : "Gregorian Date"}
                    </TableHead>
                    <TableHead
                      className={`text-emerald-800 ${
                        isArabic ? "text-center" : ""
                      }`}
                    >
                      {isArabic ? "التاريخ الهجري" : "Hijri Date"}
                    </TableHead>
                    {prayerNamesEn.map((prayer, index) => (
                      <TableHead
                        key={prayer}
                        className={`text-emerald-800 ${
                          isArabic ? "text-center" : ""
                        }`}
                      >
                        {isArabic ? prayerNamesAr[index] : prayer}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((day, index) => (
                    <TableRow
                      key={index}
                      className={`hover:bg-emerald-50 ${
                        day.date.gregorian.date === todayGregorianDate
                          ? "bg-emerald-100 border-2 border-emerald-400 shadow-md"
                          : ""
                      }`}
                    >
                      <TableCell
                        className={`font-medium ${
                          isArabic ? "text-center" : ""
                        }`}
                      >
                        {isArabic
                          ? convertToArabicNumbers(
                              `${day.date.gregorian.day} ${
                                monthsAr[day.date.gregorian.month.number - 1]
                              } ${day.date.gregorian.year}`
                            )
                          : `${day.date.gregorian.day} ${day.date.gregorian.month.en} ${day.date.gregorian.year}`}
                      </TableCell>
                      <TableCell className={isArabic ? "text-center" : ""}>
                        {isArabic
                          ? convertToArabicNumbers(
                              `${day.date.hijri.day} ${day.date.hijri.month.ar} ${day.date.hijri.year}`
                            )
                          : `${day.date.hijri.day} ${day.date.hijri.month.en} ${day.date.hijri.year}`}
                      </TableCell>
                      {prayerNamesEn.map((prayer) => (
                        <TableCell
                          key={prayer}
                          className={isArabic ? "text-center" : ""}
                        >
                          {formatTime(day.timings[prayer as keyof PrayerTimes])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-emerald-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-semibold mb-2">
            {isArabic ? "سَكِينَة" : "Sakeena"}
          </h3>
          <p className="text-emerald-200">
            {isArabic
              ? "منصة هادئة لمواقيت الصلاة الدقيقة في جميع أنحاء العالم"
              : "A tranquil platform for accurate prayer times worldwide"}
          </p>
          <p className="text-emerald-300 text-sm mt-4">
            {isArabic ? "مدعوم بواسطة Aladhan API" : "Powered by Aladhan API"}
          </p>
        </div>
      </footer>
    </div>
  );
}
