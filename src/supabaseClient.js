import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://angsgdjkmmxjfdcaepuj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZ3NnZGprbW14amZkY2FlcHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzEwMjEsImV4cCI6MjA5MzMwNzAyMX0.QfjOKXGrP5NHDIpdH7GXWrOp9e7nVHV4ccsYF1K1hxo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)