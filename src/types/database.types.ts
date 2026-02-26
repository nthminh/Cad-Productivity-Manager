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
  actual_hours: number;
  cost: number | null;
  status: 'Đang làm' | 'Chờ duyệt' | 'Hoàn thành';
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
