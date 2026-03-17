import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      "app_title": "ESPRIT CHEF",
      "enter_secret_code": "ENTER SECRET CODE",
      "subscribe_premium": "SUBSCRIBE PREMIUM",
      "secret_code_placeholder": "SECRET CODE",
      "enter_btn": "ENTER",
      "vault": "Vault",
      "search": "Search",
      "community": "Community",
      "profile": "Profile",
      "feedback": "Feedback",
      "qna": "Q&A",
      "back_to_list": "← Back to List",
      "ingredients": "Ingredients",
      "instructions": "Instructions",
      "chefs_note": "Chef's Note",
      "upload_practice_photo": "Upload Practice Photo",
      "self_evaluation": "Self Evaluation",
      "self_evaluation_placeholder": "Leave an evaluation of your cooking process and the finished dish.",
      "submit_evaluation": "Submit for Evaluation",
      "subscribe_desc": "Get unlimited access to Michelin-starred chef's private recipes.",
      "hall_of_fame": "HALL OF FAME",
      "vault_record": "VAULT RECORD",
      "preparing_ingredients": "PREPARING INGREDIENTS...",
      "empty_vault": "Empty Vault",
      "empty_vault_desc": "New recipes will be curated soon.",
      "category_foundation": "Foundation",
      "category_intermediate": "Intermediate",
      "category_professional": "Professional",
      "write_post": "Post a Creation",
      "post_placeholder": "Share the inspiration behind your culinary creation...",
      "publish_btn": "PUBLISH",
      "add_comment": "Add a comment...",
      "post_comment_btn": "Post",
      "tier_reveal": "NEXT TIER REVEAL",
      "esprit_mileage": "ESPRIT MILEAGE",
      "how_to_earn": "HOW TO EARN MILEAGE",
      "exclusive_exchanges": "EXCLUSIVE EXCHANGES",
    }
  },
  ko: {
    translation: {
      "app_title": "에스프릿 셰프",
      "enter_secret_code": "시크릿 코드로 입장",
      "subscribe_premium": "프리미엄 구독하기",
      "secret_code_placeholder": "시크릿 코드",
      "enter_btn": "입장하기",
      "vault": "레시피 보관함",
      "search": "레시피 검색",
      "community": "커뮤니티",
      "profile": "내 프로필",
      "feedback": "피드백",
      "qna": "질문답변",
      "back_to_list": "← 목록으로 돌아가기",
      "ingredients": "준비 재료",
      "instructions": "조리 과정",
      "chefs_note": "셰프의 킥",
      "upload_practice_photo": "실습 사진 업로드",
      "self_evaluation": "자가 평가",
      "self_evaluation_placeholder": "조리 과정에서의 어려움이나 완성된 요리에 대한 평가를 남겨주세요.",
      "submit_evaluation": "평가 제출하기",
      "subscribe_desc": "미쉐린 스타 셰프의 프라이빗 레시피를 무제한으로 열람하세요.",
      "hall_of_fame": "이달의 에스프릿 셰프",
      "vault_record": "마스터 레시피 보관함",
      "preparing_ingredients": "신선한 재료를 준비 중입니다...",
      "empty_vault": "보관함이 비어있습니다",
      "empty_vault_desc": "곧 새로운 시그니처 레시피가 큐레이션 됩니다.",
      "category_foundation": "기초 (Foundation)",
      "category_intermediate": "중급 (Intermediate)",
      "category_professional": "전문 (Professional)",
      "write_post": "나만의 요리 등록하기",
      "post_placeholder": "오늘 완성하신 훌륭한 요리와 영감의 순간을 나누어 주세요...",
      "publish_btn": "등록하기",
      "add_comment": "셰프님, 따뜻한 피드백을 남겨주세요...",
      "post_comment_btn": "게시",
      "tier_reveal": "다음 승급 심사 진행도",
      "esprit_mileage": "보유 에스프릿 마일리지",
      "how_to_earn": "에스프릿 마일리지 획득 안내",
      "exclusive_exchanges": "프라이빗 리워드 교환",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
