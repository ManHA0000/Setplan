import { Student } from '../types/seatPlan';

export const SAMPLE_STUDENTS: Student[] = [
  // Class 6 - Section ক (ষষ্ঠ শ্রেণী - ক শাখা)
  { id: 'c6a-1', name: 'মোঃ মাহির ফয়সাল', roll: 1, className: 'ষষ্ঠ', section: 'ক' },
  { id: 'c6a-2', name: 'আফরিন জাহান নুহা', roll: 2, className: 'ষষ্ঠ', section: 'ক' },
  { id: 'c6a-3', name: 'তাহমিদ আহমেদ', roll: 3, className: 'ষষ্ঠ', section: 'ক' },
  { id: 'c6a-4', name: 'ফারজানা আক্তার রিয়া', roll: 4, className: 'ষষ্ঠ', section: 'ক' },
  { id: 'c6a-5', name: 'হাসিবুল ইসলাম রাতুল', roll: 5, className: 'ষষ্ঠ', section: 'ক' },

  // Class 6 - Section খ (ষষ্ঠ শ্রেণী - খ শাখা)
  { id: 'c6b-1', name: 'মোঃ রায়হান উদ্দীন', roll: 1, className: 'ষষ্ঠ', section: 'খ' },
  { id: 'c6b-2', name: 'সুমাইয়া তাবাসসুম', roll: 2, className: 'ষষ্ঠ', section: 'খ' },
  { id: 'c6b-3', name: 'নাফিস ইকবাল', roll: 3, className: 'ষষ্ঠ', section: 'খ' },
  { id: 'c6b-4', name: 'জেরিন আনজুম', roll: 4, className: 'ষষ্ঠ', section: 'খ' },
  { id: 'c6b-5', name: 'তানজিমুল হক', roll: 5, className: 'ষষ্ঠ', section: 'খ' },

  // Class 7 - Section ক (সপ্তম শ্রেণী - ক শাখা)
  { id: 'c7a-1', name: 'মুহাম্মদ তাওহীদ', roll: 1, className: 'সপ্তম', section: 'ক' },
  { id: 'c7a-2', name: 'সাদিয়া সুলতানা', roll: 2, className: 'সপ্তম', section: 'ক' },
  { id: 'c7a-3', name: 'আবরার হাবিব', roll: 3, className: 'সপ্তম', section: 'ক' },
  { id: 'c7a-4', name: 'ফারিহা মেহজাবিন', roll: 4, className: 'সপ্তম', section: 'ক' },
  { id: 'c7a-5', name: 'সাজিদ হাসান', roll: 5, className: 'সপ্তম', section: 'ক' },

  // Class 7 - Section খ (সপ্তম শ্রেণী - খ শাখা)
  { id: 'c7b-1', name: 'মোঃ সাকিবুল ইসলাম', roll: 1, className: 'সপ্তম', section: 'খ' },
  { id: 'c7b-2', name: 'জান্নাতুল মাওয়া', roll: 2, className: 'সপ্তম', section: 'খ' },
  { id: 'c7b-3', name: 'ইশতিয়াক আহমেদ ইমন', roll: 3, className: 'সপ্তম', section: 'খ' },
  { id: 'c7b-4', name: 'মুসাররাত জাহান', roll: 4, className: 'সপ্তম', section: 'খ' },
  { id: 'c7b-5', name: 'রিদওয়ানুল করিম', roll: 5, className: 'সপ্তম', section: 'খ' },

  // Class 8 - Section ক (অষ্টম শ্রেণী - ক শাখা)
  { id: 'c8a-1', name: 'আব্দুল্লাহ আল নোমান', roll: 1, className: 'অষ্টম', section: 'ক' },
  { id: 'c8a-2', name: 'মারিয়া আক্তার', roll: 2, className: 'অষ্টম', section: 'ক' },
  { id: 'c8a-3', name: 'তানভীর হাসান', roll: 3, className: 'অষ্টম', section: 'ক' },
  { id: 'c8a-4', name: 'নুসরাত জাহান লিয়া', roll: 4, className: 'অষ্টম', section: 'ক' },
  { id: 'c8a-5', name: 'সাদিয়া ইসলাম', roll: 5, className: 'অষ্টম', section: 'ক' },

  // Class 8 - Section খ (অষ্টম শ্রেণী - খ শাখা)
  { id: 'c8b-1', name: 'রাকিবুল ইসলাম', roll: 1, className: 'অষ্টম', section: 'খ' },
  { id: 'c8b-2', name: 'মেহেদী হাসান সাকিব', roll: 2, className: 'অষ্টম', section: 'খ' },
  { id: 'c8b-3', name: 'ফারহানা ইয়াসমিন', roll: 3, className: 'অষ্টম', section: 'খ' },
  { id: 'c8b-4', name: 'জুবায়ের আহমেদ', roll: 4, className: 'অষ্টম', section: 'খ' },
  { id: 'c8b-5', name: 'নাফিসা তাবাসসুম', roll: 5, className: 'অষ্টম', section: 'খ' },

  // Class 9 - Science (নবম শ্রেণী - বিজ্ঞান বিভাগ)
  { id: 'c9sci-1', name: 'আরিফুল ইসলাম', roll: 1, className: 'নবম', section: 'বিজ্ঞান' },
  { id: 'c9sci-2', name: 'জান্নাতুল ফেরদৌস', roll: 2, className: 'নবম', section: 'বিজ্ঞান' },
  { id: 'c9sci-3', name: 'মোহাম্মদ রাফসান', roll: 3, className: 'নবম', section: 'বিজ্ঞান' },
  { id: 'c9sci-4', name: 'তাসমিয়া তাবাসসুম', roll: 4, className: 'নবম', section: 'বিজ্ঞান' },
  { id: 'c9sci-5', name: 'তাহমিদ চৌধুরী', roll: 5, className: 'নবম', section: 'বিজ্ঞান' },

  // Class 9 - Humanities (নবম শ্রেণী - মানবিক বিভাগ)
  { id: 'c9hum-1', name: 'মোঃ কামরুল হাসান', roll: 1, className: 'নবম', section: 'মানবিক' },
  { id: 'c9hum-2', name: 'সুমাইয়া আক্তার মিলি', roll: 2, className: 'নবম', section: 'মানবিক' },
  { id: 'c9hum-3', name: 'শামীম ওসমান', roll: 3, className: 'নবম', section: 'মানবিক' },
  { id: 'c9hum-4', name: 'রোকেয়া সুলতানা', roll: 4, className: 'নবম', section: 'মানবিক' },
  { id: 'c9hum-5', name: 'জাভেদ আখতার', roll: 5, className: 'নবম', section: 'মানবিক' },

  // Class 9 - Business Studies (নবম শ্রেণী - ব্যবসায় শিক্ষা বিভাগ)
  { id: 'c9bus-1', name: 'আসিফ ইকবাল রনি', roll: 1, className: 'নবম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c9bus-2', name: 'হুমায়রা জান্নাত', roll: 2, className: 'নবম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c9bus-3', name: 'আল আমিন হোসেন', roll: 3, className: 'নবম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c9bus-4', name: 'রুমানা পারভীন', roll: 4, className: 'নবম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c9bus-5', name: 'হাসিবুল ইসলাম', roll: 5, className: 'নবম', section: 'ব্যবসায় শিক্ষা' },

  // Class 10 - Science (দশম শ্রেণী - বিজ্ঞান বিভাগ)
  { id: 'c10sci-1', name: 'মাহদী হাসান', roll: 1, className: 'দশম', section: 'বিজ্ঞান' },
  { id: 'c10sci-2', name: 'আয়েশা সিদ্দিকা', roll: 2, className: 'দশম', section: 'বিজ্ঞান' },
  { id: 'c10sci-3', name: 'সাইফুল ইসলাম রনি', roll: 3, className: 'দশম', section: 'বিজ্ঞান' },
  { id: 'c10sci-4', name: 'তানিয়া পারভীন', roll: 4, className: 'দশম', section: 'বিজ্ঞান' },
  { id: 'c10sci-5', name: 'ফারদিন খান', roll: 5, className: 'দশম', section: 'বিজ্ঞান' },

  // Class 10 - Humanities (দশম শ্রেণী - মানবিক বিভাগ)
  { id: 'c10hum-1', name: 'সোহাগ রানা', roll: 1, className: 'দশম', section: 'মানবিক' },
  { id: 'c10hum-2', name: 'রাবেয়া বসরী', roll: 2, className: 'দশম', section: 'মানবিক' },
  { id: 'c10hum-3', name: 'আতিয়া খাতুন', roll: 3, className: 'দশম', section: 'মানবিক' },
  { id: 'c10hum-4', name: 'মশিউর রহমান', roll: 4, className: 'দশম', section: 'মানবিক' },
  { id: 'c10hum-5', name: 'মুন্নি আক্তার', roll: 5, className: 'দশম', section: 'মানবিক' },

  // Class 10 - Business Studies (দশম শ্রেণী - ব্যবসায় শিক্ষা বিভাগ)
  { id: 'c10bus-1', name: 'মোবাশ্বির আলম', roll: 1, className: 'দশম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c10bus-2', name: 'ফারিহা তাসনোভা', roll: 2, className: 'দশম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c10bus-3', name: 'নাসিমুল হক', roll: 3, className: 'দশম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c10bus-4', name: 'সায়মা আক্তার', roll: 4, className: 'দশম', section: 'ব্যবসায় শিক্ষা' },
  { id: 'c10bus-5', name: 'বিল্লাল হোসেন', roll: 5, className: 'দশম', section: 'ব্যবসায় শিক্ষা' },
];
