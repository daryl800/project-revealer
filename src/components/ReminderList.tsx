import { Check, X, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReminderItem } from "@/types/reminder";

interface ReminderListProps {
  reminders: ReminderItem[];
  setReminders: (reminders: ReminderItem[]) => void;
}

const ReminderList = ({ reminders, setReminders }: ReminderListProps) => {
  const toggleReminder = (index: number) => {
    const updated = reminders.map((reminder, i) => 
      i === index ? { ...reminder, isDone: !reminder.isDone } : reminder
    );
    setReminders(updated);
    localStorage.setItem('reminders', JSON.stringify(updated));
  };

  const deleteReminder = (index: number) => {
    const updated = reminders.filter((_, i) => i !== index);
    setReminders(updated);
    localStorage.setItem('reminders', JSON.stringify(updated));
  };

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: datetime.split(' ')[0], time: datetime.split(' ')[1] || '' };
    }
  };

  if (reminders.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No reminders yet</p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Record a voice note to add reminders
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder, index) => {
        const { date, time } = formatDateTime(reminder.datetime);
        return (
          <Card key={index} className={`bg-card/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md ${
            reminder.isDone ? 'opacity-60' : ''
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{reminder.categoryIcon}</div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    reminder.isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}>
                    {reminder.description}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{date}</span>
                    <Clock className="w-3 h-3 ml-2" />
                    <span>{time}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={reminder.isDone ? "secondary" : "default"}
                    onClick={() => toggleReminder(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteReminder(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReminderList;