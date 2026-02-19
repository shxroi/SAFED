import type { OperationStatus, OperationType } from "../../../shared/types/operation";

export const useOperationFormatters = () => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDaysLeft = (dateString: string): number | null => {
    const operationDate = new Date(dateString);
    if (Number.isNaN(operationDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    operationDate.setHours(0, 0, 0, 0);
    return Math.ceil(
      (operationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getStatusColor = (status: OperationStatus): string => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700 border-green-200";
      case "Draft":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Complete":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTypeColor = (type: OperationType): string => {
    const typeMap: Record<OperationType, string> = {
      Installation: "bg-purple-100 text-purple-700 border-purple-200",
      Maintenance: "bg-orange-100 text-orange-700 border-orange-200",
      "SAT/Commissioning": "bg-blue-100 text-blue-700 border-blue-200",
      Upgrade: "bg-teal-100 text-teal-700 border-teal-200",
      Uninstall: "bg-red-100 text-red-700 border-red-200",
    };
    return typeMap[type];
  };

  return { formatDate, getDaysLeft, getStatusColor, getTypeColor };
};
