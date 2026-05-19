import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

function formatDateTime(value) {
  if (!value) return "No disponible";

  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getCountdownTo(value) {
  if (!value) return "00:00:00";

  const diff = Math.max(0, new Date(value).getTime() - Date.now());

  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

function isPast(value) {
  return value && new Date(value).getTime() <= Date.now();
}

function getReadableTextColor(hexColor) {
  if (!hexColor || !/^#[0-9a-f]{6}$/i.test(hexColor)) {
    return "#020617";
  }

  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 150 ? "#020617" : "#f8fafc";
}

function formatInputDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function splitDateTimeLocal(value) {
  const [date, time] = value.split("T");

  return {
    date,
    time,
  };
}

function getDefaultReservationDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);

  const minutes = date.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;

  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return formatInputDateTime(date);
}

function getTodayDateInput() {
  return formatInputDateTime(new Date()).split("T")[0];
}

function eventLabel(type) {
  const labels = {
    turn_started: "inició un turno",
    turn_released: "liberó el uso del turno",
    turn_taken: "tomó el turno en curso",
    turn_completed: "finalizó por tiempo cumplido",
    next_reserved: "apartó el siguiente turno",
    scheduled_reserved: "apartó una fecha y hora específica",
    reservation_claimed: "inició su turno reservado",
    reservation_expired: "perdió su reserva por tiempo vencido",
    reservation_cancelled: "desapartó una reserva",
  };

  return labels[type] || type;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, is_profile_complete, profile_color")
      .eq("id", userId)
      .single();

    if (!error) {
      setProfile(data);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);

      if (data.session?.user?.id) {
        loadProfile(data.session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);

        if (currentSession?.user?.id) {
          loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loadingSession) {
    return <main className="page">Cargando...</main>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (!profile?.is_profile_complete) {
    return (
      <OnboardingScreen
        session={session}
        profile={profile}
        onCompleted={() => loadProfile(session.user.id)}
      />
    );
  }

  return <Dashboard session={session} profile={profile} />;
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Cuenta creada. Ahora inicia sesión.");
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      }
    }

    setLoading(false);
  }

  return (
    <main className="page auth-page">
      <section className="auth-card">
        <p className="eyebrow">TokenShift</p>
        <h1>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p className="muted">
          Entra con tu usuario para iniciar turnos, tomar tiempo restante o
          apartar el siguiente uso de Claude.
        </p>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Correo
            <input
              type="email"
              placeholder="tu-correo@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button disabled={loading}>
            {loading
              ? "Procesando..."
              : mode === "login"
              ? "Entrar"
              : "Registrarme"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <button
          className="link-button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
          }}
        >
          {mode === "login"
            ? "Crear una cuenta nueva"
            : "Ya tengo cuenta, iniciar sesión"}
        </button>
      </section>
    </main>
  );
}

function OnboardingScreen({ session, profile, onCompleted }) {
  const [name, setName] = useState(profile?.display_name || "");
  const [color, setColor] = useState(profile?.profile_color || "#22c55e");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const presetColors = [
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#14b8a6",
  ];

  async function saveProfile(event) {
    event.preventDefault();

    const cleanName = name.trim();

    if (cleanName.length < 2) {
      setMessage("Escribe un nombre válido.");
      return;
    }

    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      setMessage("Selecciona un color válido.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: cleanName,
        profile_color: color,
        is_profile_complete: true,
      })
      .eq("id", session.user.id);

    if (error) {
      setMessage(error.message);
    } else {
      onCompleted();
    }

    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <main className="page auth-page">
      <section className="auth-card">
        <p className="eyebrow">Primer ingreso</p>
        <h1>Completa tu perfil</h1>
        <p className="muted">
          Tu nombre y color se usarán para identificar tus movimientos en el
          historial público de Claude.
        </p>

        <form onSubmit={saveProfile} className="form">
          <label>
            Nombre
            <input
              type="text"
              placeholder="Ej: Juan"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label>
            Color identificador
            <div className="color-picker-row">
              {presetColors.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={`color-dot ${color === preset ? "selected" : ""}`}
                  style={{ backgroundColor: preset }}
                  onClick={() => setColor(preset)}
                  aria-label={`Seleccionar color ${preset}`}
                />
              ))}
            </div>
          </label>

          <label>
            Color personalizado
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>

          <div
            className="profile-preview"
            style={{
              backgroundColor: color,
              color: getReadableTextColor(color),
            }}
          >
            {name.trim() || "Tu nombre"}
          </div>

          <button disabled={saving}>
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <button className="link-button" onClick={logout}>
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

function Dashboard({ session, profile }) {
  const defaultSchedule = splitDateTimeLocal(getDefaultReservationDateTime());

  const [activeTurn, setActiveTurn] = useState(null);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [events, setEvents] = useState([]);
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [reservationTimer, setReservationTimer] = useState("00:00:00");
  const [scheduledDate, setScheduledDate] = useState(defaultSchedule.date);
  const [scheduledTime, setScheduledTime] = useState(defaultSchedule.time);
  const [shortTurnWarning, setShortTurnWarning] = useState(null);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const scheduledDateTime = `${scheduledDate}T${scheduledTime}`;
  const scheduledPreviewStart = new Date(scheduledDateTime);
  const scheduledPreviewEnd = new Date(
    scheduledPreviewStart.getTime() + 5 * 60 * 60 * 1000
  );

  const isMyActiveUse = activeTurn?.current_user_id === session.user.id;

  const isTurnReleased =
    activeTurn && activeTurn.status === "active" && !activeTurn.current_user_id;

  const isMyReservation = pendingReservation?.user_id === session.user.id;

  const reservationIsAvailable =
    pendingReservation && isPast(pendingReservation.available_from);

  const reservationCanStart =
    pendingReservation &&
    isMyReservation &&
    !activeTurn &&
    reservationIsAvailable &&
    !isPast(pendingReservation.expires_at);

  const canReserveNextTurn =
    activeTurn && !pendingReservation && activeTurn.started_by !== session.user.id;

  const currentUserName =
    activeTurn?.current_user_profile?.display_name ||
    (isTurnReleased ? "Turno liberado" : "Sin usuario activo");

  const currentUserColor =
    activeTurn?.current_user_profile?.profile_color ||
    activeTurn?.released_by_profile?.profile_color ||
    activeTurn?.started_by_profile?.profile_color ||
    "#64748b";

  const startedByName =
    activeTurn?.started_by_profile?.display_name || "Sin información";

  const reservedByName =
    pendingReservation?.reserved_user?.display_name || "Sin reserva";

  const reservedByColor =
    pendingReservation?.reserved_user?.profile_color || "#67e8f9";

  const platformStatus = useMemo(() => {
    if (activeTurn?.current_user_id) {
      return {
        title: "Claude bloqueado",
        description: isMyActiveUse
          ? "Tú tienes el uso activo en este momento."
          : "Otra persona está usando Claude.",
        variant: "blocked",
      };
    }

    if (isTurnReleased) {
      return {
        title: "Claude con tiempo disponible",
        description:
          "El turno fue liberado, pero la cuenta regresiva sigue corriendo.",
        variant: "released",
      };
    }

    if (pendingReservation) {
      return {
        title: "Reserva programada",
        description: isMyReservation
          ? "Tienes una reserva pendiente."
          : "Otra persona tiene una reserva pendiente.",
        variant: "reserved",
      };
    }

    return {
      title: "Claude disponible",
      description: "Puedes iniciar un nuevo turno o apartar una hora específica.",
      variant: "available",
    };
  }, [
    activeTurn,
    isMyActiveUse,
    isTurnReleased,
    pendingReservation,
    isMyReservation,
  ]);

  function openNativePicker(inputRef) {
    const input = inputRef.current;

    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  }

  async function loadState() {
    await supabase.rpc("sync_turn_state");

    const nowIso = new Date().toISOString();

    const { data: activeData, error: activeError } = await supabase
      .from("turns")
      .select(
        `
        id,
        started_by,
        current_user_id,
        released_by,
        started_at,
        ends_at,
        released_at,
        status,
        started_by_profile:profiles!turns_started_by_fkey(display_name, profile_color),
        current_user_profile:profiles!turns_current_user_id_fkey(display_name, profile_color),
        released_by_profile:profiles!turns_released_by_fkey(display_name, profile_color)
      `
      )
      .eq("status", "active")
      .gt("ends_at", nowIso)
      .order("started_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!activeError) {
      setActiveTurn(activeData || null);
      setTimeLeft(activeData ? getCountdownTo(activeData.ends_at) : "00:00:00");
    }

    const { data: reservationsData, error: reservationsError } = await supabase
      .from("turn_reservations")
      .select(
        `
        id,
        user_id,
        available_from,
        reserved_until,
        expires_at,
        status,
        created_at,
        reserved_user:profiles!turn_reservations_user_id_fkey(display_name, profile_color)
      `
      )
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .order("available_from", { ascending: true })
      .limit(10);

    if (!reservationsError) {
      const reservations = reservationsData || [];
      const firstReservation = reservations[0] || null;

      setUpcomingReservations(reservations);
      setPendingReservation(firstReservation);

      const target =
        firstReservation && isPast(firstReservation.available_from)
          ? firstReservation.expires_at
          : firstReservation?.available_from;

      setReservationTimer(target ? getCountdownTo(target) : "00:00:00");
    }

    const { data: eventData, error: eventError } = await supabase
      .from("turn_events")
      .select(
        `
        id,
        event_type,
        created_at,
        metadata,
        user_profile:profiles!turn_events_user_id_fkey(display_name, profile_color)
      `
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (!eventError) {
      setEvents(eventData || []);
    }
  }

  useEffect(() => {
    loadState();

    const channel = supabase
      .channel("turns-queue-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turns",
        },
        () => loadState()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turn_reservations",
        },
        () => loadState()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turn_events",
        },
        () => loadState()
      )
      .subscribe();

    const syncTimer = setInterval(loadState, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(syncTimer);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTurn) {
        const remaining = getCountdownTo(activeTurn.ends_at);
        setTimeLeft(remaining);

        if (remaining === "00:00:00") {
          loadState();
        }
      } else {
        setTimeLeft("00:00:00");
      }

      if (pendingReservation) {
        const target = isPast(pendingReservation.available_from)
          ? pendingReservation.expires_at
          : pendingReservation.available_from;

        const remaining = getCountdownTo(target);
        setReservationTimer(remaining);

        if (
          isPast(pendingReservation.available_from) &&
          remaining === "00:00:00"
        ) {
          loadState();
        }
      } else {
        setReservationTimer("00:00:00");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTurn, pendingReservation]);

  function handleActionError(error) {
    const errorMessage = error?.message || "Ocurrió un error inesperado.";

    if (errorMessage.startsWith("SHORT_TURN:")) {
      const jsonText = errorMessage.replace("SHORT_TURN:", "");

      try {
        const parsedWarning = JSON.parse(jsonText);
        setShortTurnWarning(parsedWarning);
        setMessage("");
      } catch {
        setMessage(errorMessage);
      }

      return;
    }

    setMessage(errorMessage);
  }

  async function callAction(functionName, successMessage, params = undefined) {
    setLoadingAction(true);
    setMessage("");
    setShortTurnWarning(null);

    const { error } = await supabase.rpc(functionName, params);

    if (error) {
      handleActionError(error);
    } else {
      setMessage(successMessage);
      await loadState();
    }

    setLoadingAction(false);
  }

  async function startTurn(acceptShort = false) {
    await callAction("start_turn_now", "Turno iniciado correctamente.", {
      p_accept_short: acceptShort,
    });
  }

  async function reserveSpecificDateTime(event) {
    event.preventDefault();

    if (!scheduledDate || !scheduledTime) {
      setMessage("Selecciona una fecha y una hora.");
      return;
    }

    const selectedDate = new Date(`${scheduledDate}T${scheduledTime}`);

    if (Number.isNaN(selectedDate.getTime())) {
      setMessage("Selecciona una fecha y hora válida.");
      return;
    }

    if (selectedDate.getTime() <= Date.now()) {
      setMessage("No puedes reservar una fecha u hora que ya pasó.");
      return;
    }

    await callAction(
      "create_scheduled_reservation",
      "Reserva creada correctamente.",
      { p_available_from: selectedDate.toISOString() }
    );
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  function renderMainActions() {
    const actions = [];

    if (!activeTurn && !pendingReservation) {
      actions.push(
        <button
          key="start"
          onClick={() => startTurn(false)}
          disabled={loadingAction}
        >
          {loadingAction ? "Procesando..." : "Iniciar mi turno"}
        </button>
      );
    }

    if (activeTurn && isMyActiveUse) {
      actions.push(
        <button
          key="release"
          className="secondary-button"
          onClick={() =>
            callAction(
              "release_my_turn",
              "Liberaste el uso. El contador seguirá corriendo."
            )
          }
          disabled={loadingAction}
        >
          {loadingAction ? "Procesando..." : "Liberar uso"}
        </button>
      );
    }

    if (activeTurn && isTurnReleased && !isMyActiveUse) {
      actions.push(
        <button
          key="take"
          onClick={() =>
            callAction(
              "take_current_turn",
              "Tomaste el turno actual con el tiempo restante."
            )
          }
          disabled={loadingAction}
        >
          {loadingAction ? "Procesando..." : "Tomar tiempo restante"}
        </button>
      );
    }

    if (canReserveNextTurn) {
      actions.push(
        <button
          key="reserve"
          className="secondary-button"
          onClick={() =>
            callAction(
              "reserve_next_turn",
              "Apartaste el siguiente turno correctamente."
            )
          }
          disabled={loadingAction}
        >
          {loadingAction ? "Procesando..." : "Apartar siguiente turno"}
        </button>
      );
    }

    if (pendingReservation && isMyReservation) {
      actions.push(
        <button
          key="cancel-reservation"
          className="danger-button"
          onClick={() =>
            callAction(
              "cancel_my_next_turn",
              "Desapartaste tu reserva correctamente."
            )
          }
          disabled={loadingAction}
        >
          {loadingAction ? "Procesando..." : "Desapartar reserva"}
        </button>
      );
    }

    if (!activeTurn && pendingReservation && isMyReservation) {
      actions.push(
        <button
          key="start-reserved"
          onClick={() => startTurn(false)}
          disabled={loadingAction || !reservationCanStart}
        >
          {reservationCanStart
            ? loadingAction
              ? "Procesando..."
              : "Iniciar turno reservado"
            : "Tu reserva aún no está disponible"}
        </button>
      );
    }

    if (!activeTurn && pendingReservation && !isMyReservation) {
      actions.push(
        <button key="reserved-other" disabled>
          Reservado por otro usuario
        </button>
      );
    }

    if (actions.length === 0) {
      actions.push(
        <button key="blocked" disabled>
          Claude bloqueado por otro usuario
        </button>
      );
    }

    return actions;
  }

  function getActionText() {
    if (!activeTurn && !pendingReservation) {
      return {
        title: "Puedes iniciar o reservar",
        text: "Puedes usar Claude ahora o apartar una fecha y hora específica.",
      };
    }

    if (activeTurn && isMyActiveUse) {
      return {
        title: "Estás usando Claude",
        text: "Puedes liberar el uso, pero el tiempo seguirá corriendo.",
      };
    }

    if (activeTurn && isTurnReleased) {
      return {
        title: "Puedes tomar el tiempo restante",
        text: "El turno sigue activo, pero nadie lo está usando ahora.",
      };
    }

    if (activeTurn && canReserveNextTurn) {
      return {
        title: "Puedes apartar el siguiente turno",
        text: "También puedes reservar una fecha y hora específica disponible.",
      };
    }

    if (pendingReservation && isMyReservation) {
      return {
        title: "Tienes una reserva pendiente",
        text: reservationIsAvailable
          ? "Tu reserva ya está disponible. Debes iniciarla antes de que venza."
          : "Tu reserva está programada para una fecha y hora específica.",
      };
    }

    return {
      title: "Debes esperar",
      text: "Claude está ocupado o hay una reserva pendiente.",
    };
  }

  const actionText = getActionText();

  return (
    <main className="app-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">TokenShift</p>
          <h1>Control de turnos</h1>
          <p className="muted">
            Administra el uso compartido de Claude con turnos, reservas y agenda.
          </p>
        </div>

        <div className="profile-chip">
          <div
            className="avatar"
            style={{
              backgroundColor: profile?.profile_color || "#67e8f9",
              color: getReadableTextColor(profile?.profile_color || "#67e8f9"),
            }}
          >
            {profile?.display_name?.charAt(0)}
          </div>

          <div>
            <span>Sesión activa</span>
            <strong>{profile?.display_name || session.user.email}</strong>
          </div>

          <button className="ghost-button" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <section className="overview-grid">
        <article className={`overview-card ${platformStatus.variant}`}>
          <span>Estado</span>
          <strong>{platformStatus.title}</strong>
          <p>{platformStatus.description}</p>
        </article>

        <article className="overview-card timer-overview">
          <span>Tiempo restante</span>
          <strong>{timeLeft}</strong>
          <p>La cuenta regresiva no se reinicia al liberar uso.</p>
        </article>

        <article className="overview-card reserved">
          <span>Próxima reserva</span>
          <strong>{pendingReservation ? "Apartada" : "Sin reserva"}</strong>
          <p>
            {pendingReservation
              ? `Reservada por ${reservedByName}`
              : "Aún no hay una reserva programada."}
          </p>
        </article>
      </section>

      <section className="dashboard-layout">
        <article className="primary-action-card">
          <div>
            <div className="section-label">Acción principal</div>
            <h2>{actionText.title}</h2>
            <p>{actionText.text}</p>
          </div>

          <div className="primary-action-button">{renderMainActions()}</div>

          {shortTurnWarning && (
            <div className="short-warning-card">
              <strong>Tu turno será más corto</strong>
              <p>
                Ya existe una reserva de{" "}
                <b>{shortTurnWarning.reserved_by}</b> para{" "}
                <b>{formatDateTime(shortTurnWarning.reservation_start)}</b>.
              </p>
              <p>
                Esa reserva fue creada el{" "}
                <b>{formatDateTime(shortTurnWarning.reserved_at)}</b>. Si
                continúas, tu turno terminará en{" "}
                <b>{formatDateTime(shortTurnWarning.short_turn_end)}</b>.
              </p>

              <div className="warning-actions">
                <button onClick={() => startTurn(true)} disabled={loadingAction}>
                  Continuar con turno corto
                </button>

                <button
                  className="secondary-button"
                  onClick={() => setShortTurnWarning(null)}
                  disabled={loadingAction}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {message && <p className="message compact-message">{message}</p>}
        </article>

        <article className="turn-card">
          <div className="section-label">Turno actual</div>

          <div className="turn-user">
            <div
              className="large-avatar"
              style={{
                backgroundColor: currentUserColor,
                color: getReadableTextColor(currentUserColor),
              }}
            >
              {currentUserName?.charAt(0) || "T"}
            </div>

            <div>
              <h2>{activeTurn ? currentUserName : "Sin turno activo"}</h2>
              <p>
                {activeTurn
                  ? isTurnReleased
                    ? "Disponible para tomar"
                    : "Usuario con uso activo"
                  : "Claude está libre"}
              </p>
            </div>
          </div>

          <div className="turn-details only-owner">
            <div>
              <span>Iniciado por</span>
              <strong>{activeTurn ? startedByName : "Nadie"}</strong>
            </div>
          </div>

          {isTurnReleased && (
            <p className="notice">
              Este turno fue liberado. Al tomarlo, usarás solo el tiempo
              restante.
            </p>
          )}
        </article>

        <aside className="queue-card">
          <div className="reservation-panel-header">
            <div>
              <div className="section-label">Agenda de reservas</div>
              <h2>Reservar horario</h2>
              <p>
                Selecciona cuándo quieres usar Claude. Cada reserva bloquea una
                franja de 4 horas.
              </p>
            </div>
          </div>

          <form
            className="schedule-form improved-schedule-form"
            onSubmit={reserveSpecificDateTime}
          >
            <div>
              <span className="schedule-title">Nuevo horario</span>
              <p className="schedule-helper">
                Selecciona el día y la hora de inicio.
              </p>
            </div>

            <div className="date-time-picker-grid">
              <label>
                Día
                <div
                  className="picker-field"
                  onClick={() => openNativePicker(dateInputRef)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      openNativePicker(dateInputRef);
                    }
                  }}
                >
                  <input
                    ref={dateInputRef}
                    type="date"
                    min={getTodayDateInput()}
                    value={scheduledDate}
                    onChange={(event) => setScheduledDate(event.target.value)}
                    onClick={() => openNativePicker(dateInputRef)}
                    onKeyDown={(event) => event.preventDefault()}
                  />
                </div>
              </label>

              <label>
                Hora de inicio
                <div
                  className="picker-field"
                  onClick={() => openNativePicker(timeInputRef)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      openNativePicker(timeInputRef);
                    }
                  }}
                >
                  <input
                    ref={timeInputRef}
                    type="time"
                    value={scheduledTime}
                    onChange={(event) => setScheduledTime(event.target.value)}
                    onClick={() => openNativePicker(timeInputRef)}
                    onKeyDown={(event) => event.preventDefault()}
                  />
                </div>
              </label>
            </div>

            <div className="reservation-preview-card">
              <span>Vista previa</span>
              <strong>
                {Number.isNaN(scheduledPreviewStart.getTime())
                  ? "Selecciona fecha y hora"
                  : `${formatDateTime(scheduledPreviewStart)} - ${formatDateTime(
                      scheduledPreviewEnd
                    )}`}
              </strong>
            </div>

            <button disabled={loadingAction}>
              {loadingAction ? "Procesando..." : "Apartar horario"}
            </button>
          </form>

          {pendingReservation ? (
            <div className="queue-user">
              <div
                className="avatar"
                style={{
                  backgroundColor: reservedByColor,
                  color: getReadableTextColor(reservedByColor),
                }}
              >
                {reservedByName?.charAt(0)}
              </div>

              <div>
                <strong>{reservedByName}</strong>
                <span>
                  {isMyReservation ? "Tu próxima reserva" : "Próxima reserva"}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-queue compact-empty">
              <strong>No hay reserva pendiente</strong>
              <p>Puedes apartar una fecha y hora disponible.</p>
            </div>
          )}

          {pendingReservation && (
            <div className="queue-info">
              <div>
                <span>Disponible desde</span>
                <strong>
                  {formatDateTime(pendingReservation.available_from)}
                </strong>
              </div>

              <div>
                <span>Reservado hasta</span>
                <strong>
                  {formatDateTime(pendingReservation.reserved_until)}
                </strong>
              </div>

              <div className="reservation-countdown">
                <span>
                  {reservationIsAvailable
                    ? "Tiempo para iniciar"
                    : "Falta para iniciar"}
                </span>
                <strong>{reservationTimer}</strong>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="agenda-section">
        <div className="agenda-header">
          <div>
            <div className="section-label">Agenda pública</div>
            <h2>Reservas programadas</h2>
            <p>
              Aquí se muestran los próximos horarios apartados. Cada reserva
              bloquea una franja de 4 horas.
            </p>
          </div>

          <div className="agenda-count">
            <strong>{upcomingReservations.length}</strong>
            <span>reservas</span>
          </div>
        </div>

        {upcomingReservations.length === 0 ? (
          <div className="agenda-empty-state">
            <strong>No hay reservas programadas</strong>
            <p>
              Cuando alguien aparte un horario específico, aparecerá en esta
              agenda.
            </p>
          </div>
        ) : (
          <div className="agenda-list">
            {upcomingReservations.map((reservation) => {
              const color =
                reservation.reserved_user?.profile_color || "#67e8f9";
              const textColor = getReadableTextColor(color);
              const mine = reservation.user_id === session.user.id;

              return (
                <article key={reservation.id} className="agenda-item">
                  <div className="agenda-date-block">
                    <span>
                      {new Date(reservation.available_from).toLocaleDateString(
                        "es-CO",
                        {
                          weekday: "short",
                        }
                      )}
                    </span>
                    <strong>
                      {new Date(reservation.available_from).toLocaleDateString(
                        "es-CO",
                        {
                          day: "2-digit",
                        }
                      )}
                    </strong>
                    <small>
                      {new Date(reservation.available_from).toLocaleDateString(
                        "es-CO",
                        {
                          month: "short",
                        }
                      )}
                    </small>
                  </div>

                  <div
                    className="agenda-user-avatar"
                    style={{
                      backgroundColor: color,
                      color: textColor,
                    }}
                  >
                    {reservation.reserved_user?.display_name?.charAt(0) || "U"}
                  </div>

                  <div className="agenda-content">
                    <div className="agenda-content-header">
                      <strong>
                        {reservation.reserved_user?.display_name ||
                          "Usuario sin nombre"}
                      </strong>

                      {mine && <span className="mine-badge">Tu reserva</span>}
                    </div>

                    <div className="agenda-time-range">
                      <span>{formatDateTime(reservation.available_from)}</span>
                      <span className="agenda-arrow">→</span>
                      <span>{formatDateTime(reservation.reserved_until)}</span>
                    </div>
                  </div>

                  {mine && (
                    <button
                      className="danger-button small-button"
                      onClick={() =>
                        callAction(
                          "cancel_my_next_turn",
                          "Desapartaste tu reserva correctamente."
                        )
                      }
                      disabled={loadingAction}
                    >
                      Desapartar
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="history-section redesigned-history">
        <div className="history-header">
          <div>
            <div className="section-label">Registro público</div>
            <h2>Historial de actividad</h2>
          </div>
          <span>{events.length} movimientos</span>
        </div>

        {events.length === 0 ? (
          <p className="muted">Aún no hay movimientos registrados.</p>
        ) : (
          <div className="timeline-list">
            {events.map((event) => {
              const userColor = event.user_profile?.profile_color || "#67e8f9";
              const textColor = getReadableTextColor(userColor);

              return (
                <article
                  key={event.id}
                  className="timeline-item user-timeline-item"
                  style={{
                    "--user-color": userColor,
                    "--user-text": textColor,
                  }}
                >
                  <div className="timeline-user-badge">
                    {event.user_profile?.display_name?.charAt(0) || "U"}
                  </div>

                  <div>
                    <strong>
                      {event.user_profile?.display_name || "Usuario sin nombre"}
                    </strong>
                    <p>{eventLabel(event.event_type)}</p>
                    <small>{formatDateTime(event.created_at)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}