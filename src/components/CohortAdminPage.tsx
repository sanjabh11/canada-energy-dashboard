import React, { useEffect, useState, useRef } from 'react';
import { ProtectedRoute, useAuth } from './auth';
import { supabase } from '../lib/supabaseClient';
import { Users, Calendar, Plus, Loader, AlertCircle, Upload, CheckCircle, XCircle } from 'lucide-react';
import { getEdgeBaseUrl } from '../lib/config';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'upcoming' | 'active' | 'completed' | 'archived';
  created_at: string;
}

interface CohortMember {
  id: string;
  learner_email: string;
  learner_full_name: string | null;
  role: string;
  invited_at: string;
  joined_at: string | null;
  completion_status: string;
}

function CohortAdminPageContent() {
  const { edubizUser } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<CohortMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  // CSV Bulk Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ email: string; name: string }[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCohorts();
  }, []);

  async function loadCohorts() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading cohorts', error);
      setError('Failed to load cohorts. Please try again.');
      setCohorts([]);
    } else {
      setCohorts((data as Cohort[]) || []);
    }
    setLoading(false);
  }

  async function handleCreateCohort(e: React.FormEvent) {
    e.preventDefault();
    if (!edubizUser?.id || !newName.trim()) return;

    setCreating(true);
    setError(null);

    const { error } = await supabase.from('cohorts').insert({
      owner_edubiz_user_id: edubizUser.id,
      name: newName.trim(),
      description: newDescription.trim() || null,
      status: 'draft',
    });

    if (error) {
      console.error('Error creating cohort', error);
      setError('Failed to create cohort. Please try again.');
    } else {
      setNewName('');
      setNewDescription('');
      await loadCohorts();
    }

    setCreating(false);
  }

  async function loadMembers(cohortId: string) {
    setLoadingMembers(true);
    setMemberError(null);

    const { data, error } = await supabase
      .from('cohort_members')
      .select('*')
      .eq('cohort_id', cohortId)
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('Error loading cohort members', error);
      setMemberError('Failed to load cohort members. Please try again.');
      setMembers([]);
    } else {
      setMembers((data as CohortMember[]) || []);
    }

    setLoadingMembers(false);
  }

  async function handleSelectCohort(cohort: Cohort) {
    setSelectedCohort(cohort);
    await loadMembers(cohort.id);
  }

  // --- Email Invitation Logic ---
  async function sendInvites(cohortId: string, emails: string[]) {
    const base = getEdgeBaseUrl();
    if (!base) return;

    console.log('Sending invites to:', emails);

    try {
      await fetch(`${base}/cohort-invite-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          cohort_id: cohortId,
          emails,
          sender_name: edubizUser?.full_name || 'Your Instructor'
        })
      });
    } catch (e) {
      console.error('Failed to send invite emails', e);
      // Non-blocking error
    }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCohort || !inviteEmail.trim()) return;

    setInviting(true);
    setMemberError(null);

    const { error } = await supabase.from('cohort_members').insert({
      cohort_id: selectedCohort.id,
      learner_email: inviteEmail.trim(),
      learner_full_name: inviteName.trim() || null,
      role: 'learner',
    });

    if (error) {
      console.error('Error inviting cohort member', error);
      setMemberError('Failed to add learner. Please try again.');
    } else {
      const emailToSend = inviteEmail.trim();
      setInviteEmail('');
      setInviteName('');
      await loadMembers(selectedCohort.id);

      // Send invitation email
      await sendInvites(selectedCohort.id, [emailToSend]);
    }

    setInviting(false);
  }

  // --- CSV Logic ---

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setCsvError('Please upload a valid CSV file.');
      return;
    }

    setCsvFile(file);
    setCsvError(null);
    setUploadSuccess(null);

    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim());
        const parsed: { email: string; name: string }[] = [];

        // Skip header if present (heuristic: checks if first line has "email")
        const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',');
          // Assume format: email, name (optional)
          const email = parts[0]?.trim();
          const name = parts[1]?.trim() || '';

          if (email && email.includes('@')) {
            parsed.push({ email, name });
          }
        }

        if (parsed.length === 0) {
          setCsvError('No valid emails found in CSV.');
        } else {
          setCsvPreview(parsed.slice(0, 5)); // Preview first 5
        }
      } catch (err) {
        setCsvError('Failed to parse CSV file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  }

  async function handleBulkEnroll() {
    if (!selectedCohort || !csvFile) return;

    setUploading(true);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim());
        const membersToInsert: {
          cohort_id: string;
          learner_email: string;
          learner_full_name: string | null;
          role: string;
        }[] = [];

        // Skip header
        const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',');
          const email = parts[0]?.trim();
          const name = parts[1]?.trim() || null;

          if (email && email.includes('@')) {
            membersToInsert.push({
              cohort_id: selectedCohort.id,
              learner_email: email,
              learner_full_name: name,
              role: 'learner'
            });
          }
        }

        if (membersToInsert.length === 0) {
          setCsvError('No valid members to upload.');
          setUploading(false);
          return;
        }

        // Batch insert
        const { error } = await supabase
          .from('cohort_members')
          .insert(membersToInsert);

        if (error) {
          console.error('Bulk upload error', error);
          setCsvError('Failed to upload members. Some might already exist.');
        } else {
          setUploadSuccess(`Successfully invited ${membersToInsert.length} learners!`);

          // Send emails in background
          const emails = membersToInsert.map(m => m.learner_email);
          sendInvites(selectedCohort.id, emails);

          setCsvFile(null);
          setCsvPreview([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
          await loadMembers(selectedCohort.id);
        }
      } catch (err) {
        setCsvError('Error processing file.');
        console.error(err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(csvFile);
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-sky-700/80 p-3 rounded-xl">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Cohort Admin Panel</h1>
              <p className="text-sky-100 text-sm mt-1">
                Launch and manage credentialed learning cohorts for your learners.
              </p>
            </div>
          </div>
          <a
            href="/profile"
            className="text-sky-100 hover:text-white transition-colors text-sm font-medium"
          >
            Back to Profile
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* New Cohort Form */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-sky-400" />
              <h2 className="text-lg font-semibold text-white">Create New Cohort</h2>
            </div>
            {edubizUser && (
              <span className="text-xs text-slate-400">
                Owner: {edubizUser.full_name || edubizUser.email}
              </span>
            )}
          </div>
          <form onSubmit={handleCreateCohort} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Cohort Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. Fall 2025 Indigenous Energy Cohort"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Description (optional)</label>
              <input
                type="text"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Short summary for funders and training coordinators"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {creating && <Loader className="h-4 w-4 animate-spin" />}
                <span>{creating ? 'Creating...' : 'Create Cohort'}</span>
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 flex items-center text-sm text-amber-300">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Cohort List */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-400" />
              <h2 className="text-lg font-semibold text-white">Your Cohorts</h2>
            </div>
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader className="h-6 w-6 text-sky-400 animate-spin" />
            </div>
          ) : cohorts.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-sm">
              No cohorts yet. Create your first cohort above to start enrolling learners.
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {cohorts.map(cohort => (
                <div
                  key={cohort.id}
                  className={`py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${selectedCohort?.id === cohort.id ? 'bg-slate-900/60 rounded-lg px-3 -mx-3' : ''
                    }`}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-white">{cohort.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-slate-900 border border-slate-600 text-slate-300">
                        {cohort.status}
                      </span>
                    </div>
                    {cohort.description && (
                      <p className="text-xs text-slate-400 max-w-xl">{cohort.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex flex-col text-right">
                      <span>Created</span>
                      <span className="text-slate-200 font-medium">
                        {new Date(cohort.created_at).toLocaleDateString('en-CA')}
                      </span>
                    </div>
                    {(cohort.start_date || cohort.end_date) && (
                      <div className="flex flex-col text-right">
                        <span>Schedule</span>
                        <span className="text-slate-200 font-medium">
                          {cohort.start_date || 'TBD'}{cohort.end_date ? ` → ${cohort.end_date}` : ''}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectCohort(cohort)}
                      className="ml-auto px-3 py-1.5 rounded-lg border border-slate-600 text-slate-100 hover:border-sky-500 hover:text-sky-200 text-xs font-medium transition-colors"
                    >
                      Manage learners
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedCohort && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Learners in {selectedCohort.name}</h2>
                <p className="text-xs text-slate-400">
                  Invite learners by email. They will appear here as they join your cohort.
                </p>
              </div>
            </div>

            <form onSubmit={handleInviteMember} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Learner email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="learner@example.com"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm text-slate-300 mb-1">Full name (optional)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Name for certificates and reports"
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {inviting && <Loader className="h-4 w-4 animate-spin" />}
                  <span>{inviting ? 'Adding...' : 'Add learner'}</span>
                </button>
              </div>
            </form>

            {memberError && (
              <div className="mb-4 flex items-center text-sm text-amber-300">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{memberError}</span>
              </div>
            )}

            {/* Bulk Upload Section */}
            <div className="mt-8 pt-8 border-t border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="h-5 w-5 text-sky-400" />
                <h3 className="text-lg font-semibold text-white">Bulk Upload via CSV</h3>
              </div>

              <div className="bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-600 p-6 text-center hover:border-sky-500 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="h-8 w-8 text-slate-400" />
                  <span className="text-slate-300 font-medium">Click to upload CSV</span>
                  <span className="text-xs text-slate-500">Format: email, name (optional) - one per line</span>
                </label>
              </div>

              {csvFile && (
                <div className="mt-4 bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">Selected: {csvFile.name}</span>
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setCsvPreview([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>

                  {csvError ? (
                    <div className="text-amber-400 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {csvError}
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-slate-400 mb-3">
                        Previewing first {csvPreview.length} entries:
                      </div>
                      <div className="space-y-1 mb-4">
                        {csvPreview.map((p, i) => (
                          <div key={i} className="text-xs flex justify-between text-slate-300 border-b border-slate-800 pb-1 last:border-0">
                            <span>{p.email}</span>
                            <span className="text-slate-500">{p.name || '-'}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleBulkEnroll}
                        disabled={uploading}
                        className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {uploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploading ? 'Uploading...' : 'Upload Learners'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  {uploadSuccess}
                </div>
              )}
            </div>

            {loadingMembers ? (
              <div className="py-6 flex items-center justify-center text-slate-400 text-sm">
                <Loader className="h-5 w-5 text-sky-400 animate-spin mr-2" />
                <span>Loading learners...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-4 text-slate-400 text-sm">
                No learners in this cohort yet.
              </div>
            ) : (
              <div className="overflow-x-auto mt-8">
                <table className="min-w-full text-xs text-left text-slate-300">
                  <thead className="border-b border-slate-700 text-slate-400">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Learner</th>
                      <th className="py-2 pr-4 font-medium">Role</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Invited</th>
                      <th className="py-2 pr-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.id} className="border-b border-slate-800 last:border-0">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-slate-100">
                            {member.learner_full_name || 'Unnamed learner'}
                          </div>
                          <div className="text-slate-400">
                            {member.learner_email}
                          </div>
                        </td>
                        <td className="py-2 pr-4 capitalize">{member.role || 'learner'}</td>
                        <td className="py-2 pr-4 capitalize">{member.completion_status || 'not_started'}</td>
                        <td className="py-2 pr-4">
                          {member.invited_at
                            ? new Date(member.invited_at).toLocaleDateString('en-CA')
                            : '–'}
                        </td>
                        <td className="py-2 pr-4">
                          {member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString('en-CA')
                            : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CohortAdminPage() {
  return (
    <ProtectedRoute requiredTier="edubiz">
      <CohortAdminPageContent />
    </ProtectedRoute>
  );
}
