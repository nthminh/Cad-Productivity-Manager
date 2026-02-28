export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  engineer_name: string;
  drawing_name: string;
  description: string | null;
  difficulty: number;
  target_hours: number;
  target_hours_period?: 'giờ' | 'ngày' | 'tuần' | 'tháng' | 'năm';
  actual_hours: number;
  cost: number | null;
  status: 'Đang làm' | 'Chờ duyệt' | 'Hoàn thành' | 'Đã hủy' | 'Tạm hoãn';
  drive_link: string | null;
  viewer_link: string | null;
  deadline: string | null;
  created_at: string;
};

export type TimeLog = {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null; // in seconds
};

export type Engineer = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  position: string;
  photo_url: string | null;
  basic_salary: number;
  email: string | null;
  phone: string | null;
  created_at: string;
};
