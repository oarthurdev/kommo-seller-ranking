
-- Add month and year columns to component_filters table
ALTER TABLE component_filters 
ADD COLUMN month INTEGER,
ADD COLUMN year INTEGER;

-- Create index for better performance
CREATE INDEX idx_component_filters_month_year ON component_filters(month, year);
