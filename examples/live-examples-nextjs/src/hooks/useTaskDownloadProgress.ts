import { useModelDownloadProgress } from '../utils/networkUtils';
import { getModelSize, TaskType } from '../utils/modelSizes';

export function useTaskDownloadProgress(task: TaskType) {
  const modelSize = getModelSize(task);
  return useModelDownloadProgress(modelSize);
}
