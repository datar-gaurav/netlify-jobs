'use client'

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  ArrowDown,
  ArrowUp,
  Trash,
  Search as SearchIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { addJobToSheet, deleteJobFromSheet, getJobPostings, initializeSheet, updateJobInSheet } from '@/lib/google-sheets';
import Markdown from 'react-markdown';

CardTitle.defaultProps = { className: "text-2xl font-semibold" };
CardDescription.defaultProps = { className: "text-muted-foreground text-sm" };
TabsTrigger.defaultProps = {
  className: "uppercase tracking-wide text-sm data-[state=active]:font-bold"
};
Input.defaultProps = {
  className: "pl-8 shadow-sm"
};
TableRow.defaultProps = {
  className: "cursor-pointer hover:bg-muted/50 transition-colors"
};
Card.defaultProps = {
  className: "shadow-md rounded-2xl border border-muted"
};
Badge.defaultProps = {
  className: "text-sm font-medium px-2 py-1 rounded-full"
};
Button.defaultProps = {
  className: "transition-transform hover:scale-105"
};

const SearchWithIcon = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="relative w-full">
    <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Search jobs..."
      value={value}
      onChange={onChange}
      className="pl-8 w-full"
    />
  </div>
);

// Removed all AI imports and logic to keep it as a pure UI to Google Sheets integration.
