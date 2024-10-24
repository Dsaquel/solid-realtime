CREATE FUNCTION set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    NEW.updated_at = now();
    return NEW;
end;
$$;


ALTER FUNCTION set_updated_at() OWNER TO postgres;

CREATE FUNCTION trigger_updated_at(tablename regclass) RETURNS void
    LANGUAGE plpgsql
    AS $$
begin
    execute format('CREATE TRIGGER set_updated_at
        BEFORE UPDATE
        ON %s
        FOR EACH ROW
        WHEN (OLD is distinct from NEW)
    EXECUTE FUNCTION set_updated_at();', tablename);
end;
$$;


ALTER FUNCTION trigger_updated_at(tablename regclass) OWNER TO postgres;

CREATE TABLE countries (
    id serial NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name text NOT NULL
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON countries FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION set_updated_at();

INSERT INTO countries (name)
  VALUES
    ('France'),
    ('Canada');

create role web_anon nologin;

grant usage on schema public to web_anon;
grant select, insert, delete, update on public.countries to web_anon;

create role authenticator noinherit login password 'mysecretpassword';
grant web_anon to authenticator;
