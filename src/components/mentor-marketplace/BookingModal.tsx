import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Mentor } from "@/types/mentor";
import { format } from "date-fns";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentor: Mentor;
  onConfirm: (date: Date, timeSlot: string) => void;
  loading?: boolean;
}

const TIME_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

export const BookingModal = ({
  open,
  onOpenChange,
  mentor,
  onConfirm,
  loading = false,
}: BookingModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  
  const hourlyRate = mentor.hourly_rate / 100;
  const platformFee = hourlyRate * 0.1; // 10% platform fee
  const total = hourlyRate + platformFee;

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      // Combine date and time
      const [time, period] = selectedTime.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      let hour24 = period === "PM" && hours !== 12 ? hours + 12 : hours;
      if (period === "AM" && hours === 12) hour24 = 0;
      
      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(hour24, minutes, 0, 0);
      
      onConfirm(bookingDate, selectedTime);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedDate(undefined);
      setSelectedTime("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a Session with {mentor.name}</DialogTitle>
          <DialogDescription>
            Select a date and time to start your 8-week coaching program
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calendar */}
          <div className="space-y-2 w-full">
            <Label>Select Date</Label>
            <div className="w-full border rounded-md bg-card p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                initialFocus
                className="w-full"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-0",
                  caption: "w-full flex justify-center items-center relative mb-4 pb-4 border-b border-border",
                  caption_label: "text-base font-semibold text-foreground",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-8 w-8 border border-border hover:bg-muted hover:border-primary transition-colors",
                  nav_button_previous: "absolute left-0",
                  nav_button_next: "absolute right-0",
                  table: "w-full border-collapse",
                  head_row: "w-full flex mt-0",
                  head_cell: "flex-1 text-center text-muted-foreground text-xs font-medium py-2",
                  row: "w-full flex mt-1",
                  cell: "flex-1 text-center",
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Time Slots */}
          {selectedDate && (
            <div className="space-y-2">
              <Label>Select Time</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? "default" : "outline"}
                    onClick={() => setSelectedTime(slot)}
                    disabled={loading}
                    className="justify-start"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Pricing Summary */}
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold">Pricing Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">8 Week Coaching Program Fee</span>
                <span>${hourlyRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Platform Fee (10%)</span>
                <span>${platformFee.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTime || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

