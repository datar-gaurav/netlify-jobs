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
import { analyzeJobDescription } from "@/ai/flows/job-keyword-analyzer";
import { analyzeJobRelevance } from "@/ai/flows/job-relevance-analyzer";
import { generateApplicationFeedback } from "@/ai/flows/application-feedback-generator";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { addJobToSheet, deleteJobFromSheet, getJobPostings, initializeSheet, updateJobInSheet } from '@/lib/google-sheets';
import Markdown from 'react-markdown';

interface JobApplication {
  employer: string;
  position: string;
  location: string;
  status: string;
  appliedDate: string;
  relevance: number | null;
  jobDescription: string;
  resume: string;
  keywords: string[];
  notes: string;
  url: string;
}

const INITIAL_RESUME = `
Experienced software engineer with a background in full-stack development. Proficient in React, Node.js, and TypeScript. Seeking a challenging role where I can leverage my skills to build innovative solutions.
`;

const STATUS_OPTIONS = ['Screening', 'Applied', 'Interviewing', 'Offer Received', 'Rejected'];

export default function Home() {
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [resume, setResume] = useState<string>(INITIAL_RESUME);
  const [notes, setNotes] = useState<string>("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [relevanceScore, setRelevanceScore] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [open, setOpen] = useState(false);
    const [resumeOpen, setResumeOpen] = useState(false);
  const [newJobUrl, setNewJobUrl] = useState("");
  const [newJobDescription, setNewJobDescription] = useState("");

  // Inline Editing
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedEmployer, setEditedEmployer] = useState<string>("");
    const [editedPosition, setEditedPosition] = useState<string>("");
    const [editedLocation, setEditedLocation] = useState<string>("");


  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof JobApplication | null>("appliedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        await initializeSheet();
        const jobData = await getJobPostings();
        const initialApplications: JobApplication[] = jobData.map(job => ({
          employer: job.Employer,
          position: job.Position,
          location: job.Location,
          status: job.Status,
          appliedDate: job['Applied Date'],
          relevance: job.Relevance != null ? parseFloat(job.Relevance) : null,
          jobDescription: job['Job Description'],
          resume: job.Resume,
          keywords: job.Keywords ? job.Keywords.split(',').map((keyword: string) => keyword.trim()) : [],
          notes: job.Notes,
          url: job.URL,
        }));
        setJobApplications(initialApplications);
      } catch (error) {
        console.error("Error fetching job data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch job data from Google Sheets.",
          variant: "destructive",
        });
      }
    };

    fetchJobData();
  }, []);

  useEffect(() => {
    const analyzeJob = async () => {
      if (selectedJob) {
        const keywordAnalysis = await analyzeJobDescription({ jobDescription: selectedJob.jobDescription });
        setKeywords(keywordAnalysis.keywords);

        const relevanceAnalysis = await analyzeJobRelevance({ jobDescription: selectedJob.jobDescription, resume: resume });
        setRelevanceScore(relevanceAnalysis.relevanceScore);

                const feedbackAnalysis = await generateApplicationFeedback({jobDescription: selectedJob.jobDescription, resume: resume});
                setFeedback(feedbackAnalysis.feedback);
      }
    };

    analyzeJob();
  }, [selectedJob, resume]);

    const handleRowClick = (job: JobApplication) => {
        setSelectedJob(job);
        setNotes(job.notes);
    };

    const handleResumeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setResume(e.target.value);
    };

    const saveResume = async () =>
    {
        // Update the resume in the selected job and Google Sheet
        if (selectedJob)
        {
            try
            {
                const updatedJob = { ...selectedJob, resume: resume };
                setSelectedJob(updatedJob);
                await updateJobInSheet(updatedJob, jobApplications.findIndex(job => job.position === selectedJob.position && job.employer === selectedJob.employer) + 2, updatedJob.keywords);
                setJobApplications(jobApplications.map(job =>
                    job.employer === selectedJob.employer && job.position === selectedJob.position ? { ...job, resume: resume } : job
                ));
                setResumeOpen(false);
                toast({
                    title: "Resume updated!",
                    description: "Your resume has been successfully updated.",
                });
            } catch (error)
            {
                console.error("Error updating resume:", error);
                toast({
                    title: "Error",
                    description: "Failed to update the resume in Google Sheets.",
                    variant: "destructive",
                });
            }
        }
    };


  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if (selectedJob) {
      const updatedJob = { ...selectedJob, notes: e.target.value };
            setSelectedJob(updatedJob);
            updateJobInSheet(updatedJob, jobApplications.findIndex(job => job.position === selectedJob.position && job.employer === selectedJob.employer) + 2, updatedJob.keywords); // +2 offset to account for header row
      setJobApplications(jobApplications.map(job =>
        job.employer === selectedJob.employer && job.position === selectedJob.position ? {...job, notes: e.target.value} : job
      ));
    }
  };

  const handleStatusChange = (status: string) => {
    if (selectedJob) {
      const updatedJob = { ...selectedJob, status: status };
            setSelectedJob(updatedJob);
            updateJobInSheet(updatedJob, jobApplications.findIndex(job => job.position === selectedJob.position && job.employer === selectedJob.employer) + 2, updatedJob.keywords); // +2 offset to account for header row
      setJobApplications(jobApplications.map(job =>
        job.employer === selectedJob.employer && job.position === selectedJob.position ? {...job, status: status} : job
      ));
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAddNewJob = async () => {
    const newJob: JobApplication = {
      employer: "To be extracted by AI",
      position: "To be extracted by AI",
      location: "To be extracted by AI",
      status: 'Screening',
      appliedDate: new Date().toLocaleDateString(),
      relevance: 0,
      jobDescription: newJobDescription,
      resume: resume,
      keywords: keywords, // Use the current keywords state
      notes: '',
      url: newJobUrl,
    };

    try {
      // Extract employer, position, and location using AI
      const keywordAnalysis = await analyzeJobDescription({ jobDescription: newJobDescription });
      const extractedKeywords = keywordAnalysis.keywords;

      // Assuming the first keyword is the position, second is employer, and third is location (This is a naive approach)
      if (extractedKeywords.length >= 3) {
        newJob.position = extractedKeywords[0];
        newJob.employer = extractedKeywords[1];
        newJob.location = extractedKeywords[2];
      }

      await addJobToSheet(newJob);
      setJobApplications([...jobApplications, newJob]);
      setOpen(false);
      toast({
        title: "Job added!",
        description: "Your job has been added to the list.",
      });

      // Refresh job applications after adding
      const updatedJobData = await getJobPostings();
      const updatedApplications: JobApplication[] = updatedJobData.map(job => ({
        employer: job.Employer,
        position: job.Position,
        location: job.Location,
        status: job.Status,
        appliedDate: job['Applied Date'],
        relevance: job.Relevance != null ? parseFloat(job.Relevance) : null,
        jobDescription: job['Job Description'],
        resume: job.Resume,
        keywords: job.Keywords ? job.Keywords.split(',').map((keyword: string) => keyword.trim()) : [],
        notes: job.Notes,
        url: job.URL,
      }));
      setJobApplications(updatedApplications);
    } catch (error) {
      console.error("Error adding new job:", error);
      toast({
        title: "Error",
        description: "Failed to add the job to Google Sheets.",
        variant: "destructive",
      });
    }
  };

    const handleDeleteJob = async () => {
        if (selectedJob) {
            const rowIndexToDelete = jobApplications.findIndex(job => job.position === selectedJob.position && job.employer === selectedJob.employer) + 2; // +2 offset to account for header row
            try {
                await deleteJobFromSheet(rowIndexToDelete);
                // Optimistically update the UI by removing the deleted job
                setJobApplications(prevJobs => prevJobs.filter(job => job.position !== selectedJob.position || job.employer !== selectedJob.employer));
                setSelectedJob(null); // Clear selected job after deletion
                toast({
                    title: "Job deleted!",
                    description: "The job has been successfully deleted.",
                });
            } catch (error) {
                console.error("Error deleting job:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete the job from Google Sheets.",
                    variant: "destructive",
                });
                // Re-fetch job data to ensure the UI is consistent with the Google Sheet
                const updatedJobData = await getJobPostings();
                const updatedApplications: JobApplication[] = updatedJobData.map(job => ({
                    employer: job.Employer,
                    position: job.Position,
                    location: job.Location,
                    status: job.Status,
                    appliedDate: job['Applied Date'],
                    relevance: job.Relevance != null ? parseFloat(job.Relevance) : null,
                    jobDescription: job['Job Description'],
                    resume: job.Resume,
                    keywords: job.Keywords ? job.Keywords.split(',').map((keyword: string) => keyword.trim()) : [],
                    notes: job.Notes,
                    url: job.URL,
                }));
                setJobApplications(updatedApplications);
            }
        }
    };

    const handleSort = (column: keyof JobApplication) =>
    {
        if (column === sortColumn)
        {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else
        {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedApplications = useMemo(() =>
    {
        if (!sortColumn) return jobApplications;

        return [...jobApplications].sort((a, b) =>
        {
            const valueA = a[sortColumn];
            const valueB = b[sortColumn];

            if (typeof valueA === 'string' && typeof valueB === 'string')
            {
                return sortDirection === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
            } else
            {
                // Handle non-string comparisons, e.g., for numbers or dates
                if (valueA === null || valueB === null)
                {
                    return 0;
                }
                if (valueA < valueB)
                {
                    return sortDirection === "asc" ? -1 : 1;
                }
                if (valueA > valueB)
                {
                    return sortDirection === "asc" ? 1 : -1;
                }
                return 0;
            }
        });
    }, [jobApplications, sortColumn, sortDirection]);

    // Pagination
    const paginatedApplications = useMemo(() =>
    {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortedApplications.slice(startIndex, endIndex);
    }, [sortedApplications, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedApplications.length / itemsPerPage);

    const handleEdit = (index: number, job: JobApplication) =>
    {
        setEditingRow(index);
        setEditedEmployer(job.employer);
        setEditedPosition(job.position);
        setEditedLocation(job.location);
    };

    const handleSave = async (index: number, job: JobApplication) =>
    {
        const updatedJob = {
            ...job,
            employer: editedEmployer,
            position: editedPosition,
            location: editedLocation,
        };

        try
        {
            await updateJobInSheet(updatedJob, index + 2, updatedJob.keywords);
            const updatedApplications = [...jobApplications];
            updatedApplications[index] = updatedJob;
            setJobApplications(updatedApplications);
            setEditingRow(null);
            toast({
                title: "Job updated!",
                description: "The job has been successfully updated.",
            });
        } catch (error)
        {
            console.error("Error updating job:", error);
            toast({
                title: "Error",
                description: "Failed to update the job in Google Sheets.",
                variant: "destructive",
            });
        }
    };

  const getMissingKeywords = () => {
    if (!selectedJob || !resume) return [];

    const resumeKeywords = resume.toLowerCase().split(/\s+/);
    const jobKeywordsLower = selectedJob.keywords.map(keyword => keyword.toLowerCase());

    return jobKeywordsLower.filter(keyword => !resumeKeywords.includes(keyword));
  };

  const missingKeywords = useMemo(getMissingKeywords, [selectedJob, resume]);


  return (
    <div className="container mx-auto p-4 flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Job Application Tracker</CardTitle>
            <CardDescription>Track your job applications and get AI-powered feedback.</CardDescription>
          </div>
          <ModeToggle />
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center space-x-2">
            <Label htmlFor="search">Search Job Postings:</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                id="search"
                placeholder="Enter search query (e.g., 'Software Engineer')"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
             <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Add Job</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Job</DialogTitle>
                  <DialogDescription>
                    Enter the job URL and description to add a new job application.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="job-url" className="text-right">
                      Job URL
                    </Label>
                    <Input
                      id="job-url"
                      value={newJobUrl}
                      onChange={(e) => setNewJobUrl(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="job-description" className="text-right">
                      Job Description
                    </Label>
                    <Textarea
                      id="job-description"
                      value={newJobDescription}
                      onChange={(e) => setNewJobDescription(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleAddNewJob}>
                    Add Job
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
                      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
                          <DialogTrigger asChild>
                              <Button variant="outline">Add Resume</Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Add Resume (Markdown)</DialogTitle>
                                  <DialogDescription>
                                      Enter your resume in Markdown format.
                                  </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="resume-markdown" className="text-right">
                                          Resume (Markdown)
                                      </Label>
                                      <Textarea
                                          id="resume-markdown"
                                          value={resume}
                                          onChange={handleResumeChange}
                                          className="col-span-3"
                                      />
                                  </div>
                              </div>
                              <DialogFooter>
                                  <Button type="button" onClick={saveResume}>
                                      Save Resume
                                  </Button>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
               <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent>
                      {[5, 10, 15, 20].map((option) => (
                          <SelectItem key={option} value={String(option)}>
                              {option}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>A list of your job applications.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort("employer")} className="cursor-pointer">
                    Employer
                    {sortColumn === "employer" && (sortDirection === "asc" ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort("position")} className="cursor-pointer">
                    Position
                    {sortColumn === "position" && (sortDirection === "asc" ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />)}
                  </TableHead>
                   <TableHead onClick={() => handleSort("location")} className="cursor-pointer">
                    Location
                    {sortColumn === "location" && (sortDirection === "asc" ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort("status")} className="cursor-pointer">
                    Status
                    {sortColumn === "status" && (sortDirection === "asc" ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort("appliedDate")} className="cursor-pointer">
                    Applied Date
                    {sortColumn === "appliedDate" && (sortDirection === "asc" ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort("relevance")} className="cursor-pointer">
                      Relevance
                      {sortColumn === "relevance" && (sortDirection === "asc" ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedApplications.map((job, index) => (
                  <TableRow key={index}  className="cursor-pointer hover:bg-accent">
                    {editingRow === index ? (
                                        <>
                                            <TableCell>
                                                <Input
                                                    type="text"
                                                    value={editedEmployer}
                                                    onChange={(e) => setEditedEmployer(e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="text"
                                                    value={editedPosition}
                                                    onChange={(e) => setEditedPosition(e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="text"
                                                    value={editedLocation}
                                                    onChange={(e) => setEditedLocation(e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>{job.status}</TableCell>
                                            <TableCell>{job.appliedDate}</TableCell>
                      <TableCell>
                        {job.relevance != null ? (
                          <Badge variant={job.relevance > 0.7 ? "default" : job.relevance > 0.4 ? "secondary" : "outline"}>
                            {(job.relevance * 100).toFixed(0) + "%"}
                          </Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="secondary" onClick={() => handleSave(index, job)}>Save</Button></TableCell>
                                        </>
                                    ) : (
                                        <>
                                            <TableCell onClick={() => handleEdit(index, job)}>{job.employer}</TableCell>
                                            <TableCell onClick={() => handleEdit(index, job)}>
                                                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">
                                                    {job.position}
                                                </a>
                                            </TableCell>
                                            <TableCell onClick={() => handleEdit(index, job)}>{job.location}</TableCell>
                                            <TableCell>{job.status}</TableCell>
                                            <TableCell>{job.appliedDate}</TableCell>
                      <TableCell onClick={() => handleEdit(index, job)}>
                        {job.relevance != null ? (
                          <Badge variant={job.relevance > 0.7 ? "default" : job.relevance > 0.4 ? "secondary" : "outline"}>
                            {(job.relevance * 100).toFixed(0) + "%"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">N/A</Badge>
                        )}
                      </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="secondary" onClick={() => handleRowClick(job)}>Details</Button>
                                            </TableCell>
                                        </>
                                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination controls */}
          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <span>{`Page ${currentPage} of ${totalPages}`}</span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedJob && (
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Details for {selectedJob.position} at {selectedJob.employer}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Job Details</TabsTrigger>
                <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4">
                <ScrollArea className="h-[200px] w-full rounded-md border p-4 whitespace-pre-line">
                  <Label>Job Description:</Label>
                  <Markdown >{selectedJob.jobDescription}</Markdown>
                </ScrollArea>
                <div>
                  <Label>URL:</Label>
                  <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">
                    View Job Posting
                  </a>
                </div>
                <div>
                  <Label>Relevance Score:</Label>
                  <Badge variant={relevanceScore && relevanceScore > 0.7 ? "default" : relevanceScore && relevanceScore > 0.4 ? "secondary" : "outline"}>
                    {relevanceScore ? (relevanceScore * 100).toFixed(0) + "%" : "N/A"}
                  </Badge>
                </div>
                <div>
                  <Label>Status:</Label>
                  <Select value={selectedJob.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                                <Button variant="destructive" onClick={handleDeleteJob}><Trash className="h-4 w-4 mr-2" />Delete Job</Button>
              </TabsContent>
              <TabsContent value="feedback" className="mt-4">
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <Label>Feedback:</Label>
                  <p className="whitespace-pre-line">{feedback}</p>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="keywords" className="mt-4">
                <Label>Keywords:</Label>
                 <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <Markdown >
                        {keywords.join(", ")}
                    </Markdown>
                </ScrollArea>
                {missingKeywords.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <Label>Suggested Keywords for Resume:</Label>
                    <ScrollArea className="h-[100px] w-full rounded-md border p-4">
                      <Markdown>
                        {missingKeywords.join(", ")}
                      </Markdown>
                    </ScrollArea>
                  </>
                )}
              </TabsContent>
              <TabsContent value="resume" className="mt-4">
                <Label>Your Resume:</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <Markdown >
                        {resume}
                    </Markdown>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="notes" className="mt-4">
                <Label>Notes:</Label>
                <Textarea value={notes} onChange={handleNotesChange} className="h-40" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
